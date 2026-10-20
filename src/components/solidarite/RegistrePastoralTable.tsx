"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Eye, Search } from "lucide-react";
import FichePastoraleMembreModal from "@/components/solidarite/FichePastoraleMembreModal";
import { formatMontant } from "@/lib/membre";
import type { FichePastoraleMembre, RegistrePastoralLigne } from "@/types/solidarite";
type Props = { lignes: RegistrePastoralLigne[]; fiches: FichePastoraleMembre[]; };
const BADGES: Record<string, string> = {
DONATEUR: "bg-emerald-500/15 text-emerald-400",
ASSISTE: "bg-amber-500/15 text-amber-300",
DONATEUR_ASSISTE: "bg-primary/15 text-accent",
NOUVEAU: "bg-muted text-muted-foreground",
};
const LIBELLES: Record<string, string> = {
DONATEUR: "Donateur",
ASSISTE: "Assiste",
DONATEUR_ASSISTE: "Donateur et Assiste",
NOUVEAU: "Nouveau",
};
export default function RegistrePastoralTable({ lignes, fiches }: Props) {
const [recherche, setRecherche] = useState("");
const [ficheId, setFicheId] = useState<string | null>(null);
const filtrees = useMemo(() => {
const q = recherche.trim().toLowerCase();
if (!q) return lignes;
return lignes.filter((l) => `${l.prenoms} ${l.nom}`.toLowerCase().includes(q) || l.telephone.includes(q));
}, [lignes, recherche]);
const fiche = useMemo(() => fiches.find((f) => f.id === ficheId) ?? null, [fiches, ficheId]);
return (
<div className="flex flex-col gap-4">
<div className="relative max-w-md">
<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
<input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher par nom ou prenom..." aria-label="Rechercher un fidele" className="h-10 w-full rounded-xl border border-card-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" />
</div>
<div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
<table className="min-w-full text-sm">
<thead>
<tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
<th className="px-5 py-3 font-medium">Nom et Prenoms</th>
<th className="px-5 py-3 font-medium">Telephone</th>
<th className="px-5 py-3 text-right font-medium">Total Contributions versees</th>
<th className="px-5 py-3 text-right font-medium">Total Aides percues</th>
<th className="px-5 py-3 font-medium">Badge Statut</th>
<th className="px-5 py-3 text-right font-medium">Fiche</th>
</tr>
</thead>
<tbody className="divide-y divide-card-border">
{filtrees.map((ligne) => (
<tr key={ligne.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => setFicheId(ligne.id)}>
<td className="px-5 py-3 font-medium text-foreground">{ligne.prenoms} {ligne.nom}<span className="block text-xs font-normal text-muted-foreground">{ligne.classe}</span></td>
<td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">{ligne.telephone}</td>
<td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-foreground">{formatMontant(ligne.totalContributions)} FCFA</td>
<td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-foreground">{formatMontant(ligne.totalAides)} FCFA</td>
<td className="px-5 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", BADGES[ligne.statut])}>{LIBELLES[ligne.statut]}</span></td>
<td className="px-5 py-3 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); setFicheId(ligne.id); }} className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><Eye className="h-3.5 w-3.5" aria-hidden />Fiche detaillee</button></td>
</tr>
))}
{filtrees.length === 0 && (
<tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun fidele ne correspond a la recherche.</td></tr>
)}
</tbody>
</table>
</div>
<FichePastoraleMembreModal fiche={fiche} onFermer={() => setFicheId(null)} />
</div>
);
}
