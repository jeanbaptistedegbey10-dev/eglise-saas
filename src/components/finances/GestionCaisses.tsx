"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, RotateCcw, Wallet } from "lucide-react";

import {
  ajusterSoldeCaisse,
  creerNouvelleCaisse,
} from "@/actions/caisse";
import { initialCaisseFormState } from "@/types/caisse";
import { formatDateISO, formatMontant } from "@/lib/membre";
import type { CaisseResume, MouvementCaisseLigne } from "@/lib/caisse";

const INPUT =
  "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40";

const LIBELLES_TYPE: Record<string, string> = {
  DON_LIBRE: "Don libre",
  TRANSFERT_COTISATION: "Transfert cotisation vers caisse",
  COMPLEMENT_COTISATION: "Complément caisse vers cotisation",
  VIREMENT_INTERNE: "Virement inter-caisses",
  AJUSTEMENT: "Ajustement de solde",
};

type Props = {
  caisses: CaisseResume[];
  mouvements: MouvementCaisseLigne[];
};

export default function GestionCaisses({ caisses, mouvements }: Props) {
  const router = useRouter();

  const [caisseOuverte, setCaisseOuverte] = useState(false);
  const [etatCaisse, actionCaisse, caisseEnCours] = useActionState(
    (_e: unknown, fd: FormData) => creerNouvelleCaisse(fd),
    initialCaisseFormState,
  );
  const nouveauNomRef = useRef<HTMLInputElement>(null);

  const [ajustementCaisseId, setAjustementCaisseId] = useState("");
  const [etatAjustement, actionAjustement, ajustementEnCours] = useActionState(
    (_e: unknown, fd: FormData) => ajusterSoldeCaisse(fd),
    initialCaisseFormState,
  );

  const etatSucces = etatCaisse.success || etatAjustement.success;
  useResetAuChangement(etatSucces, () => {
    if (etatSucces) {
      setCaisseOuverte(false);
      setAjustementCaisseId("");
    }
  });
  useEffect(() => {
    if (etatSucces) router.refresh();
  }, [etatSucces]);

  return (
    <section aria-label="Gestion des caisses" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setCaisseOuverte(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Nouvelle Caisse
          </button>
          <p className="text-xs text-muted-foreground">
            Créez une caisse interne sur mesure (Nom, Code, Description, Solde initial).
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-1 rounded-lg border border-card-border bg-background px-3 py-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Rafraîchir
        </button>
      </div>

      <div className="rounded-xl border border-card-border bg-card shadow-sm">
        <div className="border-b border-card-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" aria-hidden /> Mouvements de trésorerie
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Caisse</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Sens</th>
                <th className="px-3 py-2 text-right">Montant (FCFA)</th>
                <th className="px-3 py-2">Motif</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((m) => (
                <tr key={m.id} className="border-t border-card-border">
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDateISO(m.dateMouvement)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {m.caisseNom ?? "—"}
                    {m.cotisationNom ? ` • ${m.cotisationNom}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {LIBELLES_TYPE[m.type] ?? m.type}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={clsx(
                        "text-xs font-semibold rounded-md px-1.5",
                        m.sens === "ENTREE"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-600",
                      )}
                    >
                      {m.sens === "ENTREE" ? "+" : "-"}
                    </span>
                  </td>
                  <td className={clsx("px-3 py-2 text-right font-semibold tabular-nums", m.sens === "ENTREE" ? "text-emerald-600" : "text-red-600")}>
                    {m.sens === "ENTREE" ? "+" : "-"}{formatMontant(m.montant)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {m.motif}
                    {m.membreNom ? ` — ${m.membreNom}` : ""}
                    {m.donateurTiers ? ` — ${m.donateurTiers}` : ""}
                  </td>
                </tr>
              ))}
              {mouvements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-xs text-muted-foreground">
                    Aucun mouvement enregistré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ajustement de solde / inventaire physique par caisse */}
      {caisses.length > 0 && (
        <div className="rounded-xl border border-card-border bg-background/50 p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Ajustement de solde (inventaire physique)
          </h2>
          <form action={actionAjustement} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Caisse</label>
              <select name="caisseId" defaultValue={(ajustementCaisseId || caisses[0]?.id) ?? ""} className={INPUT}>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({formatMontant(c.soldeActuel)} FCFA)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Sens</label>
              <select name="sens" defaultValue="ENTREE" className={INPUT}>
                <option value="ENTREE">Créditer (Entrée)</option>
                <option value="SORTIE">Débiter (Sortie)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Montant (FCFA)</label>
              <input name="montant" type="number" min="0" step="0.01" required className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-4">
              <label className="text-xs font-medium text-foreground">Motif</label>
              <input name="motif" type="text" placeholder="Ex. Inventaire physique du …" maxLength={300} className={INPUT} />
            </div>
            {!etatAjustement.success && etatAjustement.message && (
              <p className="col-span-4 text-xs text-red-400">{etatAjustement.message}</p>
            )}
            {etatAjustement.success && (
              <p className="col-span-4 text-xs text-emerald-400">{etatAjustement.message}</p>
            )}
            <div className="col-span-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAjustementCaisseId("")} disabled={ajustementEnCours} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60">
                Annuler
              </button>
              <button type="submit" disabled={ajustementEnCours} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {ajustementEnCours ? "Ajustement…" : "Valider l'ajustement"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal : création de caisse */}
      {caisseOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCaisseOuverte(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl border border-card-border bg-card shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Nouvelle Caisse</h2>
              <button type="button" onClick={() => setCaisseOuverte(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fermer">✕</button>
            </div>
            <form action={actionCaisse} className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Nom *</label>
                <input ref={nouveauNomRef} name="nom" type="text" required maxLength={80} placeholder="Ex. Caisse Jeunesse" autoFocus className={INPUT} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Code</label>
                <input name="code" type="text" maxLength={30} placeholder="Ex. CAISSE_JEUNESSE" className={INPUT} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Description</label>
                <input name="description" type="text" maxLength={300} placeholder="Objet de la caisse…" className={INPUT} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Solde initial (FCFA)</label>
                <input name="soldeInitial" type="number" min="0" step="0.01" defaultValue={0} className={INPUT} />
              </div>
              {!etatCaisse.success && etatCaisse.message && <p className="text-xs text-red-400">{etatCaisse.message}</p>}
              {etatCaisse.success && <p className="text-xs text-emerald-400">{etatCaisse.message}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCaisseOuverte(false)} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                  Annuler
                </button>
                <button type="submit" disabled={caisseEnCours} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {caisseEnCours ? "Création…" : "Créer la caisse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
