"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, RotateCcw, Search } from "lucide-react";
import PhotoPreview from "@/components/membres/PhotoPreview";

export type MembreFiltreItem = {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  email: string | null;
  profession: string | null;
  adresse: string | null;
  lieuTravail: string | null;
  sexe: string | null;
  statut: string | null;
  classeAge: "ADULTE" | "JEUNE" | "ENFANT" | null;
  departements: string[];
  groupes: string[];
  photoDataUrl: string | null;
};

function genreN(s: string | null): string {
  const t = (s ?? "").toLowerCase();
  if (t.includes("homme") || t === "h" || t.includes("masculin")) return "homme";
  if (t.includes("femme") || t === "f" || t.includes("feminin") || t.includes("féminin")) return "femme";
  return "autre";
}

function statutN(s: string | null): string {
  const t = (s ?? "").toLowerCase();
  if (t.includes("suspend")) return "suspendu";
  if (t.includes("décéd") || t.includes("deced") || t.includes("décès") || t.includes("deces")) return "decede";
  if (t.includes("inactif") || t.includes("radi") || t.includes("exclu") || t.includes("observation") || t.includes("sympathisant") || t.includes("retir")) return "inactif";
  return "actif";
}

/** Tranches de cotisation (Adulte / Jeune / Enfant) — valeurs du filtre « Statut ». */
const TRANCHES_COTISATION = new Set(["ADULTE", "JEUNE", "ENFANT"]);

/** Extrait un repère de quartier depuis une adresse libre (« Tokoin, Rue 12, Lomé » → « Tokoin »). */
function quartierAdresse(adresse: string | null): string {
  const brut = (adresse ?? "").trim();
  if (brut === "") return "";
  const segments = brut.split(",").map((s) => s.trim()).filter((s) => s !== "");
  if (segments.length === 0) return brut;
  return segments.find((s) => s.toLowerCase().includes("quartier")) ?? segments[0];
}

const sel = "h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary";
const lab = "text-xs font-medium text-muted-foreground";
export default function ListeMembres({ membres }: { membres: MembreFiltreItem[] }) {
  const [q, setQ] = useState(""); const [genre, setGenre] = useState("tous"); const [statut, setStatut] = useState("tous"); const [rat, setRat] = useState("tous");
  const opts = useMemo(() => { const s = new Set<string>(); for (const m of membres) { for (const d of m.departements) { if (d.trim() !== "") s.add(d); } for (const g of m.groupes) { if (g.trim() !== "") s.add(g); } } return [...s].sort((a, b) => a.localeCompare(b, "fr")); }, [membres]);
  const filtres = useMemo(() => { const terme = q.trim().toLowerCase(); const termeTel = terme.replace(/[^0-9+]/g, ""); return membres.filter((m) => { if (terme !== "") { const hay = `${m.nom} ${m.prenoms} ${m.email ?? ""} ${m.telephone} ${m.adresse ?? ""} ${quartierAdresse(m.adresse)} ${m.profession ?? ""} ${m.lieuTravail ?? ""}`.toLowerCase(); const correspondTexte = hay.includes(terme) || (termeTel !== "" && m.telephone.replace(/[^0-9+]/g, "").includes(termeTel)); if (!correspondTexte) return false; } if (genre !== "tous" && genreN(m.sexe) !== genre) return false; if (statut !== "tous") { if (TRANCHES_COTISATION.has(statut)) { if (m.classeAge !== statut) return false; } else if (statutN(m.statut) !== statut) return false; } if (rat !== "tous" && !m.departements.includes(rat) && !m.groupes.includes(rat)) return false; return true; }); }, [membres, q, genre, statut, rat]);
  const actif = q.trim() !== "" || genre !== "tous" || statut !== "tous" || rat !== "tous";
  const reset = () => { setQ(""); setGenre("tous"); setStatut("tous"); setRat("tous"); };
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Filtres des membres" className="flex flex-wrap items-end gap-3 rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm">
        <div className="flex min-w-72 flex-[2] flex-col gap-1.5">
          <label htmlFor="membres-recherche" className={lab}>Recherche</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input id="membres-recherche" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom, prénom, téléphone, métier, quartier, adresse, lieu de travail..." className="h-10 w-full rounded-lg border border-card-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" />
          </div>
        </div>
        <div className="flex min-w-36 flex-col gap-1.5">
          <label htmlFor="membres-genre" className={lab}>Genre</label>
          <select id="membres-genre" value={genre} onChange={(e) => setGenre(e.target.value)} className={sel}>
            <option value="tous">Tous</option><option value="homme">Homme</option><option value="femme">Femme</option>
          </select>
        </div>
        <div className="flex min-w-36 flex-col gap-1.5">
          <label htmlFor="membres-statut" className={lab}>Statut</label>
          <select id="membres-statut" value={statut} onChange={(e) => setStatut(e.target.value)} className={sel}>
            <option value="tous">Tous</option>
            <optgroup label="Tranche de cotisation">
              <option value="ADULTE">Adulte</option><option value="JEUNE">Jeune</option><option value="ENFANT">Enfant</option>
            </optgroup>
            <optgroup label="Statut administratif">
              <option value="actif">Actif</option><option value="inactif">Inactif</option><option value="suspendu">Suspendu</option><option value="decede">Décédé</option>
            </optgroup>
          </select>
        </div>
        <div className="flex min-w-44 flex-col gap-1.5">
          <label htmlFor="membres-rat" className={lab}>Département / Groupe</label>
          <select id="membres-rat" value={rat} onChange={(e) => setRat(e.target.value)} className={sel}>
            <option value="tous">Tous</option>
            {opts.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </div>
        <button type="button" onClick={reset} disabled={!actif} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-card-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
          <RotateCcw className="h-4 w-4" aria-hidden />Réinitialiser
        </button>
      </section>
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">{filtres.length} membre(s) affiché(s){actif ? " (filtres actifs)" : ""}</p>
      <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Photo</th><th className="px-5 py-3 font-medium">Nom</th><th className="px-5 py-3 font-medium">Prénoms</th><th className="px-5 py-3 font-medium">Téléphone</th><th className="px-5 py-3 font-medium">Profession</th><th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {filtres.map((m) => (
              <tr key={m.id} className="transition-colors hover:bg-muted/40">
                <td className="px-5 py-3">
                  <PhotoPreview
                    photoDataUrl={m.photoDataUrl}
                    initiales={`${m.prenoms.charAt(0)}${m.nom.charAt(0)}`.toUpperCase()}
                    nomComplet={`${m.nom} ${m.prenoms}`}
                    taille="sm"
                  />
                </td>
                <td className="px-5 py-3 font-medium text-foreground">{m.nom}</td>
                <td className="px-5 py-3 text-foreground">{m.prenoms}</td>
                <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">{m.telephone}</td>
                <td className="px-5 py-3 text-muted-foreground">{((m.profession ?? "") !== "" ? (m.profession as string) : "—")}</td>
                <td className="px-5 py-3"><div className="flex items-center justify-end gap-2">
                  <Link href={`/membres/${m.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Eye className="h-3.5 w-3.5" aria-hidden />Voir la fiche
                  </Link>
                </div></td>
              </tr>
            ))}
            {filtres.length === 0 && (<tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">Aucun membre ne correspond aux filtres.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
