"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MapPin, Navigation } from "lucide-react";
type Suggestion = { place_id: number; display_name: string; lat: string; lon: string };
type Props = { valeurInitiale?: string | null; latitudeInitiale?: number | null; longitudeInitiale?: number | null; erreur?: string; valeur?: string; onValeurChange?: (v: string) => void; latitude?: number | null; longitude?: number | null; onPositionChange?: (pos: { lat: number; lon: number } | null) => void };
const DEFAUT = { lat: 5.345317, lon: -4.024429 };
function bbox(lat: number, lon: number, d = 0.02): string { return `${lon - d},${lat - d},${lon + d},${lat + d}`; }
export default function AdresseAutocompleteMap({ valeurInitiale, latitudeInitiale, longitudeInitiale, erreur, valeur, onValeurChange, latitude, longitude, onPositionChange }: Props) {
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
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOuverte(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = recherche.trim();
    if (q.length < 3) { setSuggestions([]); setChargement(false); return; }
    setChargement(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error("http");
        setSuggestions((await r.json()) as Suggestion[]);
        setOuverte(true);
      } catch { setSuggestions([]); } finally { setChargement(false); }
    }, 320);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [recherche]);
  const choisir = (s: Suggestion) => {
    setRecherche(s.display_name);
    setValidee(s.display_name);
    setPosition({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) });
    setOuverte(false); setSuggestions([]);
  };
  const c = position ?? DEFAUT;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox(c.lat, c.lon)}&layer=mapnik` + (position ? `&marker=${position.lat},${position.lon}` : "");
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
        <div className="overflow-hidden rounded-xl border border-card-border">
          <iframe title="Carte adresse membre" src={src} className="h-64 w-full border-0" loading="lazy" />
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Navigation className="h-3.5 w-3.5 text-accent" aria-hidden />
          {position ? `Marqueur : ${position.lat.toFixed(6)}, ${position.lon.toFixed(6)}` : "Selectionnez une suggestion pour positionner le marqueur."}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="adresse" className="text-sm font-medium text-foreground">Adresse complete validee (enregistree en base)</label>
        <textarea id="adresse" name="adresse" rows={3} value={validee} onChange={(e) => setValidee(e.target.value)} placeholder="Remplie auto apres selection, modifiable." aria-invalid={erreur ? true : undefined} className="flex w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40" />
        {erreur ? <p className="text-xs text-red-400">{erreur}</p> : <p className="text-xs text-muted-foreground">Utilisee pour recherches et visites pastorales.</p>}
      </div>
      <input type="hidden" name="adresseLatitude" value={position ? String(position.lat) : ""} />
      <input type="hidden" name="adresseLongitude" value={position ? String(position.lon) : ""} />
    </div>
  );
}
