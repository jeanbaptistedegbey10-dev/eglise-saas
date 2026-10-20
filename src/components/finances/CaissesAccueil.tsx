"use client";
import { useActionState, useEffect, useState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import { Landmark, Plus, Wallet } from "lucide-react";
import { creerNouvelleCaisse } from "@/actions/caisse";
import { initialCaisseFormState, type CaisseFormState } from "@/types/caisse";
import { formatMontant } from "@/lib/finance";
import type { CaisseResume } from "@/lib/caisse";
type Props = { caisses: CaisseResume[]; };
const INPUT = "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";
export default function CaissesAccueil({ caisses }: Props) {
const router = useRouter();
const [ouvert, setOuvert] = useState(false);
const [etat, action, enCours] = useActionState((_prev: CaisseFormState, fd: FormData) => creerNouvelleCaisse(fd), initialCaisseFormState);
useResetAuChangement(etat, () => {
  if (etat.success) setOuvert(false);
});
useEffect(() => {
  if (etat.success) router.refresh();
}, [etat]);
return (
<section aria-label="Caisses disponibles" className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
<header className="flex flex-wrap items-start justify-between gap-3">
<div className="flex flex-col gap-1">
<p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent"><Landmark className="h-3.5 w-3.5" aria-hidden />Caisses disponibles</p>
<h2 className="text-lg font-semibold text-foreground">Soldes reels des caisses</h2>
<p className="text-sm text-muted-foreground">Caisses creees en base via prisma.caisse.findMany().</p>
</div>
<button type="button" onClick={() => setOuvert(!ouvert)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
<Plus className="h-3.5 w-3.5" aria-hidden />Nouvelle Caisse
</button>
</header>
{ouvert && (
<form action={action} className="grid grid-cols-1 gap-3 rounded-xl border border-card-border bg-background/60 p-4 sm:grid-cols-2">
<div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Nom *</label><input name="nom" required maxLength={80} placeholder="Ex. Caisse Jeunesse" className={INPUT} /></div>
<div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Solde initial</label><input name="soldeInitial" type="number" min={0} step="0.01" defaultValue={0} className={INPUT} /></div>
<div className="flex flex-col gap-1.5 sm:col-span-2"><label className="text-sm font-medium">Description</label><input name="description" maxLength={300} className={INPUT} /></div>
{!etat.success && etat.message && (<p className="text-xs text-red-400 sm:col-span-2">{etat.message}</p>)}
<div className="flex justify-end gap-2 sm:col-span-2">
<button type="button" onClick={() => setOuvert(false)} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
<button type="submit" disabled={enCours} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60">{enCours ? "Creation..." : "Creer la caisse"}</button>
</div>
</form>
)}
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
{caisses.map((c) => (
<div key={c.id} className="flex flex-col gap-1 rounded-2xl border border-card-border bg-background/60 px-4 py-3">
<span className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Wallet className="h-4 w-4 text-accent" aria-hidden />{c.nom}</span>
{c.description && (<span className="text-xs text-muted-foreground">{c.description}</span>)}
<span className="text-lg font-semibold tabular-nums text-foreground">{formatMontant(c.soldeActuel)} FCFA</span>
<span className="text-xs text-muted-foreground">solde reel{c.estParDefaut ? " — par defaut" : ""}</span>
</div>
))}
{caisses.length === 0 && (<p className="rounded-xl border border-dashed border-card-border px-4 py-6 text-center text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">Aucune caisse en base. Creez la premiere avec Nouvelle Caisse.</p>)}
</div>
</section>
);
}
