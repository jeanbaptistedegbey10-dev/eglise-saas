"use client";
import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, LoaderCircle, Users, X } from "lucide-react";
import { affecterMembresGroupe } from "@/actions/groupes-membres";
import { initialOrganisationFormState, nomCompletMembre } from "@/types/organisation";
import type { MembreLie, MembreOptionOrganisation, RoleOrganisation } from "@/types/organisation";
import { INPUT_CLS, Err } from "./ui";
type Props = { groupeId: string; nom: string; actuels: MembreLie[]; membres: MembreOptionOrganisation[]; departements: { id: string; nom: string }[] };
type Ligne = { membreId: string; role: RoleOrganisation };
export default function GererMembresGroupeModal({ groupeId, nom, actuels, membres, departements }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(affecterMembresGroupe, initialOrganisationFormState);
  const [lignes, setLignes] = useState<Ligne[]>(actuels.map((a) => ({ membreId: a.membreId, role: a.role })));
  useEffect(() => { if (etat.success) { setOpen(false); router.refresh(); } }, [etat, router]);
  return (
    <>
      <button type="button" onClick={() => { setLignes(actuels.map((a) => ({ membreId: a.membreId, role: a.role }))); setOpen(true); }} title="Gérer les membres" aria-label={`Gérer ${nom}`} className="inline-flex items-center rounded-lg border border-card-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
        <Users className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" tabIndex={-1} aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div><p className="text-xs font-medium uppercase tracking-wide text-accent">Membres</p>
              <h2 className="text-lg font-semibold text-foreground">{nom}</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <form action={formAction} className="flex flex-col gap-3 px-6 py-5">
              <input type="hidden" name="groupeId" value={groupeId} />
              {lignes.map((l) => (
                <span key={l.membreId}>
                  <input type="hidden" name="membreId" value={l.membreId} />
                  <input type="hidden" name="role" value={l.role} />
                </span>
              ))}
              {!etat.success && etat.message && (<div role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{etat.message}</span></div>)}
              <div className="max-h-80 overflow-y-auto rounded-xl border border-card-border bg-background p-2">
                {membres.map((m) => {
                  const l = lignes.find((x) => x.membreId === m.id);
                  const coche = Boolean(l);
                  return (
                    <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60">
                      <input type="checkbox" checked={coche} onChange={() => setLignes((p) => (coche ? p.filter((x) => x.membreId !== m.id) : [...p, { membreId: m.id, role: "MEMBRE" as RoleOrganisation }]))} className="h-4 w-4 accent-violet-600" aria-label={nomCompletMembre(m)} />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{nomCompletMembre(m)}</span>
                      {coche && (
                        <select value={l?.role ?? "MEMBRE"} onChange={(e) => setLignes((p) => p.map((x) => (x.membreId === m.id ? { ...x, role: e.target.value as RoleOrganisation } : x)))} className={INPUT_CLS}>
                          {["RESPONSABLE", "MEMBRE_BUREAU", "MEMBRE"].map((r) => (<option key={r} value={r}>{r === "RESPONSABLE" ? "Responsable" : r === "MEMBRE_BUREAU" ? "Membre du bureau" : "Membre"}</option>))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{lignes.length} membre(s).</p>
              <div className="flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4 -mx-6 -mb-5">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuler</button>
                <button type="submit" disabled={enCours} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {enCours ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
