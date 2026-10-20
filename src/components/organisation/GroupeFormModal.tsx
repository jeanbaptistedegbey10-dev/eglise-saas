"use client";
import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, CircleAlert, LoaderCircle, Pencil, UsersRound, X } from "lucide-react";
import { enregistrerGroupe } from "@/actions/groupes";
import { initialOrganisationFormState, nomCompletMembre } from "@/types/organisation";
import type { DepartementOption, GroupeEditable, GroupeOption, MembreOptionOrganisation } from "@/types/organisation";
import { INPUT_CLS, Err } from "./ui";

type Props = {
  membres: MembreOptionOrganisation[];
  groupes: GroupeOption[];
  departements: DepartementOption[];
  groupe?: GroupeEditable | null;
  triggerLabel?: string;
};

export default function GroupeFormModal({ membres, groupes, departements, groupe, triggerLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(enregistrerGroupe, initialOrganisationFormState);
  const [bureau, setBureau] = useState(groupe?.aUnBureau ?? false);
  const [sous, setSous] = useState(groupe?.estSousGroupe ?? false);
  const err = (c: string) => etat.fieldErrors[c]?.[0];

  useEffect(() => {
    if (etat.success) {
      setOpen(false);
      router.refresh();
    }
  }, [etat, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setBureau(groupe?.aUnBureau ?? false);
          setSous(groupe?.estSousGroupe ?? false);
          setOpen(true);
        }}
        className={clsx(
          "inline-flex items-center gap-2 rounded-xl text-sm",
          groupe
            ? "border border-card-border bg-card px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            : "bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90",
        )}
      >
        {groupe ? <Pencil className="h-4 w-4" aria-hidden /> : <UsersRound className="h-4 w-4" aria-hidden />}
        {triggerLabel ?? (groupe ? "Modifier" : "Nouveau groupe")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Organisation</p>
                <h2 className="text-lg font-semibold text-foreground">{groupe ? "Modifier le groupe" : "Nouveau groupe"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <form action={formAction} className="flex flex-col gap-4 px-6 py-5">
              {groupe && <input type="hidden" name="id" defaultValue={groupe.id} />}
              {!etat.success && etat.message && (
                <div role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{etat.message}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gr-nom" className="text-sm font-medium text-foreground">Nom du groupe *</label>
                <input
                  id="gr-nom"
                  name="nom"
                  required
                  maxLength={120}
                  defaultValue={groupe?.nom ?? ""}
                  placeholder="Ex. Chorale adultes"
                  className={clsx(INPUT_CLS, err("nom") && "border-red-500/70")}
                />
                <Err msg={err("nom")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gr-desc" className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  id="gr-desc"
                  name="description"
                  rows={3}
                  maxLength={500}
                  defaultValue={groupe?.description ?? ""}
                  placeholder="Objet du groupe..."
                  className="flex w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-card-border bg-muted/40 px-4 py-3">
                <span className="text-sm">
                  <span className="font-medium text-foreground">Est-il un sous-groupe ?</span>
                  <br />
                  <span className="text-xs text-muted-foreground">Rattache ce groupe a un groupe parent.</span>
                </span>
                <input
                  type="checkbox"
                  name="estSousGroupe"
                  checked={sous}
                  onChange={(e) => setSous(e.target.checked)}
                  className="h-5 w-5 accent-violet-600"
                />
              </label>

              {sous ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gr-parent" className="text-sm font-medium text-foreground">Groupe parent</label>
                  <select id="gr-parent" name="parentId" defaultValue={groupe?.parentId ?? ""} className={INPUT_CLS}>
                    <option value="">Selectionner un groupe parent</option>
                    {groupes
                      .filter((g) => g.id !== groupe?.id)
                      .map((g) => (
                        <option key={g.id} value={g.id}>{g.nom}</option>
                      ))}
                  </select>
                  <Err msg={err("parentId")} />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gr-dep" className="text-sm font-medium text-foreground">Departement de rattachement</label>
                  <select id="gr-dep" name="departementId" defaultValue={groupe?.departementId ?? ""} className={INPUT_CLS}>
                    <option value="">Aucun (groupe independant)</option>
                    {departements.map((d) => (
                      <option key={d.id} value={d.id}>{d.nom}</option>
                    ))}
                  </select>
                  <Err msg={err("departementId")} />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gr-resp" className="text-sm font-medium text-foreground">Responsable du groupe</label>
                <select id="gr-resp" name="responsableId" defaultValue={groupe?.responsableId ?? ""} className={INPUT_CLS}>
                  <option value="">Aucun responsable</option>
                  {membres.map((m) => (
                    <option key={m.id} value={m.id}>{nomCompletMembre(m)}</option>
                  ))}
                </select>
                <Err msg={err("responsableId")} />
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-card-border bg-muted/40 px-4 py-3">
                <span className="text-sm">
                  <span className="font-medium text-foreground">A-t-il un bureau ?</span>
                  <br />
                  <span className="text-xs text-muted-foreground">Active la selection des membres du bureau.</span>
                </span>
                <input
                  type="checkbox"
                  name="aUnBureau"
                  checked={bureau}
                  onChange={(e) => setBureau(e.target.checked)}
                  className="h-5 w-5 accent-violet-600"
                />
              </label>

              {bureau && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Membres du bureau *</span>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-card-border bg-background p-2">
                    {membres.map((m) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60">
                        <input
                          type="checkbox"
                          name="bureauIds"
                          value={m.id}
                          defaultChecked={groupe?.bureauIds.includes(m.id)}
                          className="h-4 w-4 accent-violet-600"
                        />
                        <span className="text-foreground">{nomCompletMembre(m)}</span>
                      </label>
                    ))}
                  </div>
                  <Err msg={err("bureauIds")} />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4 -mx-6 -mb-5">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enCours}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {enCours ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
                  {enCours ? "..." : groupe ? "Mettre a jour" : "Creer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}