"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import { definirCaisseParDefaut, modifierCaisse, supprimerCaisse } from "@/actions/caisse";
import { initialCaisseFormState } from "@/types/caisse";
import { formatMontant } from "@/lib/membre";
import type { CaisseResume } from "@/lib/caisse";
const INPUT = "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40";
type Props = { caisse: CaisseResume };
export default function CarteCaisse({ caisse }: Props) {
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [editionOuverte, setEditionOuverte] = useState(false);
  const [suppressionOuverte, setSuppressionOuverte] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [etatEdition, actionEdition, editionEnCours] = useActionState((_e: unknown, fd: FormData) => modifierCaisse(caisse.id, fd), initialCaisseFormState);
  const [etatDefaut, actionDefaut, defautEnCours] = useActionState(() => definirCaisseParDefaut(caisse.id), initialCaisseFormState);
  const [etatSuppression, actionSuppression, suppressionEnCours] = useActionState(() => supprimerCaisse(caisse.id), initialCaisseFormState);
  const etatSucces = etatEdition.success || etatDefaut.success || etatSuppression.success;
  useResetAuChangement(etatSucces, () => {
    if (etatSucces) {
      setEditionOuverte(false);
      setSuppressionOuverte(false);
      setMenuOuvert(false);
    }
  });
  useEffect(() => {
    if (etatSucces) router.refresh();
  }, [etatSucces]);
  useEffect(() => {
    if (!menuOuvert) return;
    const fermer = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOuvert(false); };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOuvert(false); };
    document.addEventListener("mousedown", fermer); document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("mousedown", fermer); document.removeEventListener("keydown", echap); };
  }, [menuOuvert]);
  return (
    <div className="relative rounded-xl border border-card-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-foreground truncate">{caisse.nom}</h3>
        <div className="flex items-center gap-1 shrink-0">
          {caisse.estParDefaut && (<span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Défaut</span>)}
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setMenuOuvert((v) => !v)} aria-label={`Actions pour ${caisse.nom}`} aria-haspopup="menu" aria-expanded={menuOuvert} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <MoreVertical className="h-4 w-4" aria-hidden />
            </button>
            {menuOuvert && (
              <div role="menu" className="absolute right-0 top-8 z-20 w-56 overflow-hidden rounded-xl border border-card-border bg-card shadow-lg">
                <button type="button" role="menuitem" onClick={() => { setEditionOuverte(true); setMenuOuvert(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-muted">
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier la caisse
                </button>
                {!caisse.estParDefaut && (
                  <form action={actionDefaut}>
                    <button type="submit" role="menuitem" disabled={defautEnCours} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-muted disabled:opacity-60">
                      <Star className="h-3.5 w-3.5" aria-hidden />{defautEnCours ? "Définition…" : "Définir comme caisse par défaut"}
                    </button>
                  </form>
                )}
                <button type="button" role="menuitem" onClick={() => { setSuppressionOuverte(true); setMenuOuvert(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Supprimer la caisse
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {caisse.code && (<p className="text-xs text-muted-foreground truncate">{caisse.code}</p>)}
      <div className="mt-2 flex items-end gap-1">
        <span className="text-2xl font-bold text-foreground tabular-nums">{formatMontant(caisse.soldeActuel)}</span>
        <span className="text-sm font-medium text-muted-foreground">FCFA</span>
      </div>
      {caisse.description && (<p className="mt-2 text-xs text-muted-foreground line-clamp-2">{caisse.description}</p>)}
      <p className="mt-1 text-xs text-muted-foreground">Solde initial : {formatMontant(caisse.soldeInitial)} FCFA</p>
      {!etatDefaut.success && etatDefaut.message && (<p className="mt-2 text-xs text-red-400">{etatDefaut.message}</p>)}
      {etatDefaut.success && (<p className="mt-2 text-xs text-emerald-400">{etatDefaut.message}</p>)}
      {editionOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditionOuverte(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl border border-card-border bg-card shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Modifier la caisse</h2>
              <button type="button" onClick={() => setEditionOuverte(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fermer">✕</button>
            </div>
            <form action={actionEdition} className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1"><label className="text-sm font-medium text-foreground">Nom *</label><input name="nom" type="text" required maxLength={80} defaultValue={caisse.nom} className={INPUT} /></div>
              <div className="flex flex-col gap-1"><label className="text-sm font-medium text-foreground">Code</label><input name="code" type="text" maxLength={30} defaultValue={caisse.code ?? ""} className={INPUT} /></div>
              <div className="flex flex-col gap-1"><label className="text-sm font-medium text-foreground">Description</label><input name="description" type="text" maxLength={300} defaultValue={caisse.description ?? ""} className={INPUT} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1"><label className="text-sm font-medium text-foreground">Solde initial (FCFA)</label><input name="soldeInitial" type="number" min="0" step="0.01" defaultValue={caisse.soldeInitial} className={INPUT} /></div>
                <div className="flex flex-col gap-1"><label className="text-sm font-medium text-foreground">Solde actuel (FCFA)</label><input name="soldeActuel" type="number" min="0" step="0.01" defaultValue={caisse.soldeActuel} className={INPUT} /></div>
              </div>
              {!etatEdition.success && etatEdition.message && (<p className="text-xs text-red-400">{etatEdition.message}</p>)}
              {etatEdition.success && (<p className="text-xs text-emerald-400">{etatEdition.message}</p>)}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditionOuverte(false)} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
                <button type="submit" disabled={editionEnCours} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{editionEnCours ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {suppressionOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSuppressionOuverte(false)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-xl border border-card-border bg-card shadow-lg p-6">
            <h2 className="text-lg font-semibold text-foreground">Supprimer la caisse ?</h2>
            <p className="mt-2 text-sm text-muted-foreground">« {caisse.nom} » sera supprimee. Impossible si elle a des mouvements lies.</p>
            {!etatSuppression.success && etatSuppression.message && (<p className="mt-2 text-xs text-red-400">{etatSuppression.message}</p>)}
            <form action={actionSuppression} className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSuppressionOuverte(false)} disabled={suppressionEnCours} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60">Annuler</button>
              <button type="submit" disabled={suppressionEnCours} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-600/90 disabled:opacity-60">{suppressionEnCours ? "Suppression…" : "Supprimer"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
