"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AlertCircle, LoaderCircle, MapPin, Navigation, TriangleAlert } from "lucide-react";
type Suggestion = { place_id: number; display_name: string; lat: string; lon: string };
type Props = {
  valeurInitiale?: string | null;
  latitudeInitiale?: number | null;
  longitudeInitiale?: number | null;
  erreur?: string;
  valeur?: string;
  onValeurChange?: (v: string) => void;
  latitude?: number | null;
  longitude?: number | null;
  onPositionChange?: (pos: { lat: number; lon: number } | null) => void;
  /** Localisation GPS de l'église (ex: "6.199667, 1.152278" ou "6°11'58.8\"N 1°09'08.2\"E"). */
  localisationGpsEglise?: string | null;
};
const DEFAUT = { lat: 6.137, lon: 1.212 };
const TILE = 256;
const RAYON_TERRE_KM = 6371;
function lonToX(lon: number, z: number): number { return ((lon + 180) / 360) * 2 ** z * TILE; }
function latToY(lat: number, z: number): number {
  const clamped = Math.min(Math.max(lat, -85.051129), 85.051129);
  const rad = (clamped * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z * TILE;
}
function xToLon(x: number, z: number): number { return (x / (TILE * 2 ** z)) * 360 - 180; }
function yToLat(y: number, z: number): number {
  const n = 2 ** z;
  const rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (n * TILE))));
  return (rad * 180) / Math.PI;
}
function urlTuile(mode: 'plan' | 'satellite' | 'dark', z: number, x: number, y: number, s = 'a'): string {
  switch (mode) {
    case 'satellite':
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
    case 'dark':
      return `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
    case 'plan':
    default:
      return `https://${s}.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png`;
  }
}
/**
 * Parse une chaîne de localisation GPS vers { lat, lon }.
 * Accepte :
 *  - décimales : "6.199667, 1.152278" ou "6.199667 1.152278"
 *  - DMS : "6°11'58.8\"N 1°09'08.2\"E"
 * Retourne null si le format n'est pas reconnu.
 */
function parserGps(valeur: string | null | undefined): { lat: number; lon: number } | null {
  if (!valeur || typeof valeur !== "string") return null;
  const trimmed = valeur.trim();
  if (!trimmed) return null;

  // --- Format décimal : "6.199667, 1.152278" ou "6.199667 1.152278" ---
  const decMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*[, ]\s*([+-]?\d+(?:\.\d+)?)$/);
  if (decMatch) {
    const lat = parseFloat(decMatch[1]);
    const lon = parseFloat(decMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }

  // --- Format DMS : "6°11'58.8\"N 1°09'08.2\"E" ---
  const dmsMatch = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*[°°]\s*(\d+(?:\.\d+)?)\s*['’′]\s*(\d+(?:\.\d+)?)\s*["”″]\s*([NSEO])\s+(\d+(?:\.\d+)?)\s*[°°]\s*(\d+(?:\.\d+)?)\s*['’′]\s*(\d+(?:\.\d+)?)\s*["”″]\s*([NSEO])$/i
  );
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]);
    const latMin = parseFloat(dmsMatch[2]);
    const latSec = parseFloat(dmsMatch[3]);
    const latHem = dmsMatch[4].toUpperCase();
    const lonDeg = parseFloat(dmsMatch[5]);
    const lonMin = parseFloat(dmsMatch[6]);
    const lonSec = parseFloat(dmsMatch[7]);
    const lonHem = dmsMatch[8].toUpperCase();
    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latHem === "S") lat = -lat;
    let lon = lonDeg + lonMin / 60 + lonSec / 3600;
    if (lonHem === "O" || lonHem === "W") lon = -lon;
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }

  return null;
}
/**
 * Distance à vol d'oiseau (km) entre deux points GPS via la formule de Haversine.
 * Retourne null si l'un des points est manquant.
 */
function distanceHaversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const la1 = rad(a.lat);
  const la2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return RAYON_TERRE_KM * c;
}
/**
 * Temps de trajet estimé en minutes à partir d'une distance (km).
 * Vitesse moyenne hypothétique : 30 km/h en zone urbaine (~2 min/km).
 */
function estimerTrajetsMinutes(km: number): number {
  return Math.round(km * 2);
}

function rendreTuiles(
  centre: { lat: number; lon: number },
  z: number,
  dims: { w: number; h: number },
  modeCarte: 'plan' | 'satellite' | 'dark' = 'plan',
): React.ReactNode[] {
  const { w, h } = dims;
  const cx = lonToX(centre.lon, z);
  const cy = latToY(centre.lat, z);
  const tuiles: React.ReactNode[] = [];
  for (
    let ty = Math.floor((cy - h / 2) / TILE) - 1;
    ty <= Math.floor((cy + h / 2) / TILE) + 1;
    ty++
  ) {
    for (
      let tx = Math.floor((cx - w / 2) / TILE) - 1;
      tx <= Math.floor((cx + w / 2) / TILE) + 1;
      tx++
    ) {
      const sousDomaine = ['a', 'b', 'c'][(tx + ty) % 3];
      tuiles.push(
        <img
          key={`${z}-${tx}-${ty}`}
          src={urlTuile(modeCarte, z, tx, ty, sousDomaine)}
          alt=""
          decoding="async"
          loading="eager"
          referrerPolicy="no-referrer"
          draggable="false"
          onError={(e) => {
            // Tuile indisponible (réseau / politique d'usage OSM) : on la masque
            // proprement pour éviter l'icône d'image cassée ("bloc gris") sur la carte.
            const target = e.target as HTMLImageElement | null;
            if (target) target.style.display = "none";
          }}
          style={{
            position: "absolute",
            left: tx * TILE - cx + w / 2,
            top: ty * TILE - cy + h / 2,
            width: TILE,
            height: TILE,
            pointerEvents: "none",

          }}
        />
      );
    }
  }
  return tuiles;
}
export default function AdresseAutocompleteMap({ valeurInitiale, latitudeInitiale, longitudeInitiale, erreur, valeur, onValeurChange, latitude, longitude, onPositionChange, localisationGpsEglise }: Props) {
  const controle = valeur !== undefined && onValeurChange;
  const [recherche, setRecherche] = useState(valeur ?? valeurInitiale ?? "");
  // Quand le formulaire parent se réinitialise (ouverture / autre membre),
  // resynchronise le champ de recherche avec la valeur contrôlée.
  const derniereValeurRef = useRef(valeur ?? valeurInitiale ?? "");
  useEffect(() => {
    if (controle && valeur !== derniereValeurRef.current) {
      derniereValeurRef.current = valeur as string;
      setRecherche(valeur as string);
    }
  }, [controle, valeur]);
  const [valideeInterne, setValideeInterne] = useState(valeurInitiale ?? "");
  const validee = controle ? (valeur as string) : valideeInterne;
  const setValidee = (v: string) => { if (controle) onValeurChange?.(v); else setValideeInterne(v); };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [chargement, setChargement] = useState(false);
  const [ouverte, setOuverte] = useState(false);
  /** Message d'indisponibilité du service d'autocomplétion (Nominatim). */
  const [erreurRecherche, setErreurRecherche] = useState<string | null>(null);
  const [geocodageCarte, setGeocodageCarte] = useState(false);
  const [positionInterne, setPositionInterne] = useState<{ lat: number; lon: number } | null>(
    latitudeInitiale != null && longitudeInitiale != null ? { lat: latitudeInitiale, lon: longitudeInitiale } : null,
  );
  const position = latitude !== undefined || longitude !== undefined
    ? (latitude != null && longitude != null ? { lat: latitude, lon: longitude } : null)
    : positionInterne;
  const setPosition = (p: { lat: number; lon: number } | null) => {
    if (onPositionChange) onPositionChange(p); else setPositionInterne(p);
  };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zoom, setZoom] = useState(13);
  const [centreCarte, setCentreCarte] = useState<{ lat: number; lon: number } | null>(null);
  const [dimensionsCarte, setDimensionsCarte] = useState<{ w: number; h: number } | null>(null);
  const [modeCarte, setModeCarte] = useState<'plan' | 'satellite' | 'dark'>('plan');
  const carteRef = useRef<HTMLDivElement>(null);
  const glisserDebut = useRef<{ x: number; y: number; lat: number; lon: number } | null>(null);
  const surSourisEnBaisser = (e: React.MouseEvent) => {
    glisserDebut.current = { x: e.clientX, y: e.clientY, lat: centre.lat, lon: centre.lon };
    window.addEventListener("mousemove", surSourisMouvement);
    window.addEventListener("mouseup", surSourisLeve);
  };
  const surSourisMouvement = (e: MouseEvent) => {
    if (!glisserDebut.current || !dimensionsCarte) return;
    const d = glisserDebut.current;
    const pw = lonToX(d.lon, zoom) - (e.clientX - d.x);
    const ph = latToY(d.lat, zoom) - (e.clientY - d.y);
    setCentreCarte({ lat: yToLat(ph, zoom), lon: xToLon(pw, zoom) });
  };
  const surSourisLeve = () => {
    glisserDebut.current = null;
    window.removeEventListener("mousemove", surSourisMouvement);
    window.removeEventListener("mouseup", surSourisLeve);
  };
  const surCliquerCarte = (e: React.MouseEvent) => {
    if (!carteRef.current || !dimensionsCarte) return;
    const rect = carteRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const gx = lonToX(centre.lon, zoom) - dimensionsCarte.w / 2 + sx;
    const gy = latToY(centre.lat, zoom) - dimensionsCarte.h / 2 + sy;
    const suivant = { lat: yToLat(gy, zoom), lon: xToLon(gx, zoom) };
    setCentreCarte(suivant);
    setPosition(suivant);
    void adresserPositionCarte(suivant);
  };
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOuverte(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  // Dimensions du conteneur de la carte (mesurées après le premier rendu
  // et réévaluées si le conteneur est redimensionné ou rendu visible).
  useEffect(() => {
    if (!carteRef.current) return;
    const mesurer = () =>
      setDimensionsCarte({
        w: Math.max(carteRef.current!.offsetWidth, 1),
        h: Math.max(carteRef.current!.offsetHeight, 1),
      });
    mesurer();
    const observer = new ResizeObserver(mesurer);
    observer.observe(carteRef.current);
    return () => observer.disconnect();
  }, []);

  // Recentre la carte sur la position lorsqu'elle vient de l'extérieur (suggestion / props).
  useEffect(() => {
    if (position) setCentreCarte(position);
  }, [position?.lat, position?.lon]);

  // --- Coordonnées de l'église (parse de localisationGpsEglise) ---
  const egliseCoords = useMemo(() => parserGps(localisationGpsEglise), [localisationGpsEglise]);

  // --- Distance pastorale : église → membre (Haversine) ---
  const distanceKm = useMemo(() => {
    if (!position || !egliseCoords) return null;
    return distanceHaversineKm(egliseCoords, position);
  }, [position, egliseCoords]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = recherche.trim();
    let controller: AbortController | null = null;
    if (q.length < 3) { setSuggestions([]); setChargement(false); setErreurRecherche(null); return; }
    setChargement(true);
    setErreurRecherche(null);
    controller = new AbortController();
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          headers: { Accept: "application/json", "User-Agent": "eglise-saas/1.0" },
          signal: controller.signal,
        });
        if (!r.ok) throw new Error("http");
        setSuggestions((await r.json()) as Suggestion[]);
        setOuverte(true);
        setErreurRecherche(null);
      } catch (err: any) {
        // Annulation due à une saisie rapide : on ignore silencieusement
        // pour éviter l'alerte / rejet non géré AbortError dans la console.
        if (err?.name === "AbortError" || err?.message?.includes("aborted")) return;
        // ÉCHEC NOMINATIM (réseau / CORS / indisponible) : on ne propage
        // jamais l'erreur, on vide simplement les suggestions sans bloquer
        // l'interface. L'adresse saisie manuellement est préservée.
        setSuggestions([]);
        setOuverte(false);
      } finally {
        if (!controller.signal.aborted) setChargement(false);
      }
    }, 320);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (controller && !controller.signal.aborted) controller.abort();
    };
  }, [recherche]);
  const choisir = (s: Suggestion) => {
    setRecherche(s.display_name);
    setValidee(s.display_name);
    setPosition({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) });
    setOuverte(false); setSuggestions([]); setErreurRecherche(null);
  };

  /**
   * Géocodage inverse de l'emplacement actuellement centré sur la carte
   * (Nominatim) : remplit le champ "Adresse complète validée" en lecture seule
   * sans que l'utilisateur ait à taper.
   */
  const adresserPositionCarte = async (p: { lat: number; lon: number }) => {
    setGeocodageCarte(true);
    try {
      const r = await fetch(
        `/api/geocode?q=${p.lat},${p.lon}&accept-language=fr`,
        { headers: { Accept: "application/json", "User-Agent": "eglise-saas/1.0" } },
      );
      if (!r.ok) throw new Error("http");
      const data = (await r.json()) as { display_name?: string };
      if (data.display_name) {
        setRecherche(data.display_name);
        setValidee(data.display_name);
        setOuverte(false);
        setSuggestions([]);
      }
    } catch {
      // L'adresse reste à remplir via une suggestion si le géocodage inverse échoue.
    } finally {
      setGeocodageCarte(false);
    }
  };
  const centre = centreCarte ?? position ?? DEFAUT;
  /* Rendu actif des tuiles OpenStreetMap (aucun iframe, aucun contenu bloqué) */
  return (
    <div className="flex flex-col gap-4">
      <div ref={boxRef} className="relative flex flex-col gap-1.5">
        <label htmlFor="adresse-recherche" className="text-sm font-medium text-foreground">Rechercher une adresse</label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input id="adresse-recherche" type="text" role="combobox" aria-expanded={ouverte} aria-controls="adresse-suggestions" aria-autocomplete="list" autoComplete="off" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Tapez quartier, rue, ville… (ex. Tokoin, Lomé)" className="flex h-10 w-full rounded-lg border border-card-border bg-background pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40" />
          {chargement && <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
        </div>
        <p className="text-xs text-muted-foreground">Suggestions dynamiques des 3 lettres. Selection = carte recentree + marqueur + champ valide rempli.</p>
        {erreurRecherche && (
          <p role="status" className="flex items-start gap-1.5 text-xs text-amber-400">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{erreurRecherche}</span>
          </p>
        )}
        {ouverte && suggestions.length > 0 && (
          <ul id="adresse-suggestions" role="listbox" aria-label="Suggestions" className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-card-border bg-card shadow-xl">
            {suggestions.map((s) => (
              <li key={s.place_id} role="option" aria-selected={false}>
                <button type="button" onClick={() => choisir(s)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span className="line-clamp-2">{s.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Carte interactive</span>
        <div ref={carteRef} className="relative overflow-hidden rounded-xl border border-card-border bg-[#f0fdf4] h-64 min-h-[300px] invert-[5%]" onMouseDown={surSourisEnBaisser} onClick={surCliquerCarte}>
          {dimensionsCarte ? (
            <>
              {rendreTuiles(centre, zoom, dimensionsCarte, modeCarte)}
              <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setZoom((p) => Math.min(p + 1, 18)); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-background text-sm font-medium text-foreground hover:bg-muted"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setZoom((p) => Math.max(p - 1, 3)); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-background text-sm font-medium text-foreground hover:bg-muted"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setModeCarte((p) => (p === 'plan' ? 'satellite' : p === 'satellite' ? 'dark' : 'plan')); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-background text-sm font-medium text-foreground hover:bg-muted"
                  title={`Vue : ${modeCarte === 'plan' ? 'Plan' : modeCarte === 'satellite' ? 'Satellite' : 'Sombre'}`}
                >
                  {modeCarte === 'plan' ? '🗺️' : modeCarte === 'satellite' ? '🛰️' : '🌙'}
                </button>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: dimensionsCarte.w / 2 - 12,
                  top: dimensionsCarte.h / 2 - 26,
                  pointerEvents: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
                title={`Marqueur : ${centre.lat.toFixed(4)}, ${centre.lon.toFixed(4)}`}
                aria-label={`Marqueur centré sur ${centre.lat.toFixed(4)}, ${centre.lon.toFixed(4)}`}
              >
                <MapPin className="h-6 w-6 text-red-600" aria-hidden />
                <span className="text-[10px] bg-background border border-card-border px-1.5 py-0.5 rounded shadow-sm text-foreground">Marqueur</span>
              </div>
              <p className="absolute bottom-1 left-1 text-[10px] text-muted-foreground">© OpenStreetMap France contributors</p>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm bg-[#f0fdf4]/40">
              <MapPin className="h-8 w-8 text-red-400/40 mb-2" aria-hidden />
              <p>Carte interactive — chargement des tuiles…</p>
            </div>
          )}
        </div>
        {position && (
          <button
            type="button"
            onClick={() => void adresserPositionCarte(position)}
            disabled={geocodageCarte}
            className="flex items-center gap-1.5 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 disabled:cursor-not-allowed hover:bg-muted"
          >
            {geocodageCarte ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            )}
            Adresse de l'emplacement centré sur la carte
          </button>
        )}
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Navigation className="h-3.5 w-3.5 text-accent" aria-hidden />
          {position
            ? `Marqueur : ${position.lat.toFixed(6)}, ${position.lon.toFixed(6)}`
            : "Carte centrée par défaut sur Lomé, Togo."}
        </p>
        {distanceKm != null && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
            📍 Distance de l&apos;église : {distanceKm.toFixed(1)} km (~{estimerTrajetsMinutes(distanceKm)} min en trajet)
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="adresse" className="text-sm font-medium text-foreground">Adresse complete validee (enregistree en base)</label>
        <textarea
          id="adresse"
          name="adresse"
          rows={3}
          value={validee}
          readOnly
          placeholder="Remplie automatiquement après sélection d'une suggestion ou de l'emplacement sur la carte. Saisie directe désactivée."
          aria-invalid={erreur ? true : undefined}
          className="flex w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {erreur ? (
          <p className="text-xs text-red-400">{erreur}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Remplie automatiquement depuis la carte ou les suggestions. Utilisée pour recherches et visites pastorales.
          </p>
        )}
      </div>
      <input type="hidden" name="adresseLatitude" value={position ? String(position.lat) : ""} />
      <input type="hidden" name="adresseLongitude" value={position ? String(position.lon) : ""} />
    </div>
  );
}
