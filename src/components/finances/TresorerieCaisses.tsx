"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { HandCoins, Landmark, MoveRight, Plus, Wallet } from "lucide-react";

import {
  completerCotisationDepuisCaisse,
  creerNouvelleCaisse,
  enregistrerDonLibreCaisse,
  transfererCotisationVersCaisse,
} from "@/actions/caisse";
import { initialCaisseFormState } from "@/types/caisse";
import { MODES_PAIEMENT, formatMontant } from "@/lib/finance";
import { formatDateISO } from "@/lib/membre";
import type { CaisseResume, MouvementCaisseLigne } from "@/lib/caisse";
import type { CotisationPourDepense, MembrePourDepense } from "@/types/depense";

const INPUT =
  "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40";

const LIBELLES_TYPE: Record<string, string> = {
  DON_LIBRE: "Don libre",
  TRANSFERT_COTISATION: "Transfert cotisation vers caisse",
  COMPLEMENT_COTISATION: "Complement caisse vers cotisation",
  VIREMENT_INTERNE: "Virement interne",
  AJUSTEMENT: "Ajustement",
};

type Props = {
  caisses: CaisseResume[];
  mouvements: MouvementCaisseLigne[];
  cotisations: CotisationPourDepense[];
  membres: MembrePourDepense[];
};

export default function TresorerieCaisses({ caisses, mouvements, cotisations, membres }: Props) {
  const router = useRouter();
  const [panneau, setPanneau] = useState<"aucun" | "don" | "virement" | "caisse">("aucun");
  const [donCaisseId, setDonCaisseId] = useState(caisses[0]?.id ?? "");
  const [sensVirement, setSensVirement] = useState<"vers-caisse" | "vers-cotisation">("vers-caisse");

  const [etatDon, actionDon, donEnCours] = useActionState(
    (_e: unknown, fd: FormData) => enregistrerDonLibreCaisse(fd),
    initialCaisseFormState,
  );
  const [etatVirement, actionVirement, virementEnCours] = useActionState(
    (_e: unknown, fd: FormData) =>
      sensVirement === "vers-caisse"
        ? transfererCotisationVersCaisse(fd)
        : completerCotisationDepuisCaisse(fd),
    initialCaisseFormState,
  );
  const [etatCaisse, actionCaisse, caisseEnCours] = useActionState(
    (_e: unknown, fd: FormData) => creerNouvelleCaisse(fd),
    initialCaisseFormState,
  );

  useEffect(() => {
    if (etatDon.success || etatVirement.success || etatCaisse.success) {
      setPanneau("aucun");
      router.refresh();
    }
  }, [etatDon, etatVirement, etatCaisse, router]);

  return (
    <section aria-label="Caisses et tresorerie" className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent">
            <Landmark className="h-3.5 w-3.5" aria-hidden /> Caisses et Tresorerie
          </p>
          <h2 className="text-lg font-semibold text-foreground">Soldes des caisses internes</h2>
          <p className="text-sm text-muted-foreground">Dons libres, virements et historique des mouvements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPanneau(panneau === "don" ? "aucun" : "don")} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <HandCoins className="h-3.5 w-3.5" aria-hidden /> Nouveau Don Libre
          </button>
          <button type="button" onClick={() => setPanneau(panneau === "virement" ? "aucun" : "virement")} className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">
            <MoveRight className="h-3.5 w-3.5" aria-hidden /> Virement / Complement
          </button>
          <button type="button" onClick={() => setPanneau(panneau === "caisse" ? "aucun" : "caisse")} className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Nouvelle caisse
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {caisses.map((caisse) => (
          <article key={caisse.id} className="rounded-xl border border-card-border bg-background/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" aria-hidden /> {caisse.code ?? "Caisse"}
              {caisse.estParDefaut ? " - par defaut" : ""}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-foreground">{caisse.nom}</h3>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{formatMontant(caisse.soldeActuel)} <span className="text-sm font-medium text-muted-foreground">FCFA</span></p>
            <p className="mt-1 text-xs text-muted-foreground">{caisse.description ?? "-"}</p>
            <button type="button" onClick={() => { setDonCaisseId(caisse.id); setPanneau("don"); }} className="mt-3 text-xs font-medium text-primary hover:underline">Alimenter cette caisse</button>
          </article>
        ))}
        {caisses.length === 0 && (
          <p className="rounded-xl border border-dashed border-card-border px-4 py-6 text-center text-sm text-muted-foreground sm:col-span-3">
            Tables Caisses non disponibles : executez prisma migrate dev puis prisma generate pour activer la tresorerie.
          </p>
        )}
      </div>
      {panneau === "don" && (
        <form action={actionDon} className="grid grid-cols-1 gap-3 rounded-xl border border-card-border bg-background/60 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium" htmlFor="don-caisse">Caisse destinataire *</label>
            <select id="don-caisse" name="caisseId" value={donCaisseId} onChange={(e) => setDonCaisseId(e.target.value)} className={INPUT}>
              {caisses.map((c) => (<option key={c.id} value={c.id}>{c.nom} (Solde : {formatMontant(c.soldeActuel)} FCFA)</option>))}
            </select></div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium" htmlFor="don-montant">Montant (FCFA) *</label>
            <input id="don-montant" name="montant" type="number" min={0} step="0.01" required placeholder="Ex. 50000" className={INPUT} /></div>
          <div className="flex flex-col gap-1.5 sm:col-span-2"><label className="text-sm font-medium" htmlFor="don-motif">Motif *</label>
            <input id="don-motif" name="motif" type="text" required maxLength={300} placeholder="Ex. Don libre du culte" className={INPUT} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium" htmlFor="don-membre">Membre donateur (facultatif)</label>
            <select id="don-membre" name="membreId" className={INPUT} defaultValue="">
              <option value="">-</option>
              {membres.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
            </select></div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium" htmlFor="don-tiers">Donateur externe (facultatif)</label>
            <input id="don-tiers" name="donateurTiers" type="text" maxLength={150} placeholder="Nom si personne externe" className={INPUT} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium" htmlFor="don-mode">Mode de paiement</label>
            <select id="don-mode" name="modePaiement" className={INPUT} defaultValue="ESPECES">
              {MODES_PAIEMENT.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select></div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium" htmlFor="don-piece">N° piece (facultatif)</label>
            <input id="don-piece" name="numeroPiece" type="text" maxLength={80} className={INPUT} /></div>
          {!etatDon.success && etatDon.message && (
            <p className="text-xs text-red-400 sm:col-span-2">{etatDon.message}</p>
          )}
          {etatDon.success && <p className="text-xs text-emerald-400 sm:col-span-2">{etatDon.message}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setPanneau("aucun")} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
            <button type="submit" disabled={donEnCours} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{donEnCours ? "Enregistrement…" : "Enregistrer le don"}</button>
          </div>
        </form>
      )}
      {panneau === "virement" && (
        <form action={actionVirement} className="grid grid-cols-1 gap-3 rounded-xl border border-card-border bg-background/60 p-4 sm:grid-cols-2">
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button key="vers-caisse" type="button" onClick={() => setSensVirement("vers-caisse")} className={clsx("rounded-lg border px-3 py-2 text-xs font-medium", sensVirement === "vers-caisse" ? "border-primary bg-primary/10 text-foreground" : "border-card-border text-muted-foreground hover:bg-muted")}>
              Cotisation vers Caisse (projet annule / surplus)
            </button>
            <button key="vers-cotisation" type="button" onClick={() => setSensVirement("vers-cotisation")} className={clsx("rounded-lg border px-3 py-2 text-xs font-medium", sensVirement === "vers-cotisation" ? "border-primary bg-primary/10 text-foreground" : "border-card-border text-muted-foreground hover:bg-muted")}>
              Caisse vers Cotisation (appoint, ex. loyer)
            </button>
          </div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Caisse *</label>
            <select name="caisseId" className={INPUT} required defaultValue={caisses[0]?.id ?? ""}>
              {caisses.map((c) => (<option key={c.id} value={c.id}>{c.nom} (Solde : {formatMontant(c.soldeActuel)} FCFA)</option>))}
            </select></div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Cotisation *</label>
            <select name="cotisationId" className={INPUT} required defaultValue="">
              <option value="">Selectionnez…</option>
              {cotisations.map((c) => (<option key={c.id} value={c.id}>{c.nom} — Solde dispo: {formatMontant(Math.max(c.soldeDisponible ?? 0, 0))} FCFA{c.estCloture ? " (Cloturee)" : ""}</option>))}
            </select></div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Montant (FCFA) *</label>
            <input name="montant" type="number" min={0} step="0.01" required className={INPUT} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Motif *</label>
            <input name="motif" type="text" required maxLength={300} className={INPUT} /></div>
          {!etatVirement.success && etatVirement.message && (
            <p className="text-xs text-red-400 sm:col-span-2">{etatVirement.message}</p>
          )}
          {etatVirement.success && <p className="text-xs text-emerald-400 sm:col-span-2">{etatVirement.message}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setPanneau("aucun")} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
            <button type="submit" disabled={virementEnCours} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{virementEnCours ? "Transfert…" : "Valider le transfert"}</button>
          </div>
        </form>
      )}
      {panneau === "caisse" && (
        <form action={actionCaisse} className="grid grid-cols-1 gap-3 rounded-xl border border-card-border bg-background/60 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Nom *</label>
            <input name="nom" type="text" required maxLength={80} placeholder="Ex. Caisse Jeunesse" className={INPUT} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Solde initial (FCFA)</label>
            <input name="soldeInitial" type="number" min={0} step="0.01" defaultValue={0} className={INPUT} /></div>
          <div className="flex flex-col gap-1.5 sm:col-span-2"><label className="text-sm font-medium">Description</label>
            <input name="description" type="text" maxLength={300} className={INPUT} /></div>
          {!etatCaisse.success && etatCaisse.message && (
            <p className="text-xs text-red-400 sm:col-span-2">{etatCaisse.message}</p>
          )}
          {etatCaisse.success && <p className="text-xs text-emerald-400 sm:col-span-2">{etatCaisse.message}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setPanneau("aucun")} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
            <button type="submit" disabled={caisseEnCours} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{caisseEnCours ? "Creation…" : "Creer la caisse"}</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Caisse</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Motif</th><th className="px-3 py-2 text-right">Montant</th></tr>
          </thead>
          <tbody>
            {mouvements.map((m) => (
              <tr key={m.id} className="border-t border-card-border">
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateISO(m.dateMouvement)}</td>
                <td className="px-3 py-2 text-xs">{m.caisseNom ?? "-"} {m.cotisationNom ? `• ${m.cotisationNom}` : ""}</td>
                <td className="px-3 py-2 text-xs">{LIBELLES_TYPE[m.type] ?? m.type}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{m.motif}{m.membreNom ? ` — ${m.membreNom}` : m.donateurTiers ? ` — ${m.donateurTiers}` : ""}</td>
                <td className={clsx("px-3 py-2 text-right font-semibold", m.sens === "ENTREE" ? "text-emerald-400" : "text-red-400")}>
                  {m.sens === "ENTREE" ? "+" : "-"}{formatMontant(m.montant)} FCFA
                </td>
              </tr>
            ))}
            {mouvements.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">Aucun mouvement enregistre pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}