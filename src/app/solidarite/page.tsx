import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, HeartHandshake, Lock, ShieldCheck } from "lucide-react";
import AideFormModal from "@/components/solidarite/AideFormModal";
import SupprimerAideButton from "@/components/solidarite/SupprimerAideButton";
import { prisma } from "@/lib/prisma";
import type { AideResume, MembreOption } from "@/types/solidarite";
export const metadata: Metadata = { title: "Solidarité & Aides", description: "Suivi confidentiel des aides distribuées aux membres et bénéficiaires externes." };
export const dynamic = "force-dynamic";
function versISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}
export default async function SolidaritePage() {
  let aides: AideResume[] = [];
  let membres: MembreOption[] = [];
  let erreurBase: string | null = null;
  try {
    const [lignesAides, lignesMembres] = await Promise.all([
      prisma.aideDistribution.findMany({ orderBy: { dateDistribution: "desc" }, include: { beneficiaireMembre: { select: { nom: true, prenoms: true } } } }),
      prisma.membre.findMany({ orderBy: [{ nom: "asc" }, { prenoms: "asc" }], select: { id: true, nom: true, prenoms: true, telephone: true } }),
    ]);
    aides = lignesAides.map((a) => ({
      id: a.id, dateISO: versISO(a.dateDistribution), dateAffichee: formatDate(a.dateDistribution),
      motif: a.motif, montantOuNature: a.montantOuNature, notesConflictuelles: a.notesConflictuelles,
      beneficiaireMembreId: a.beneficiaireMembreId,
      beneficiaireNom: a.beneficiaireMembre ? `${a.beneficiaireMembre.prenoms} ${a.beneficiaireMembre.nom}` : null,
    }));
    membres = lignesMembres;
  } catch (e) {
    console.error("Erreur chargement solidarité :", e);
    erreurBase = "Impossible de joindre la base. Vérifiez DATABASE_URL puis réessayez.";
  }
  const dateInitiale = versISO(new Date());
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Pastorale</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Solidarité &amp; Aides reçues</h1>
          <p className="text-sm text-muted-foreground">Suivi confidentiel des aides (membre optionnel, montant ou nature, motif, date).</p>
        </div>
        <div className="flex items-center gap-3">
          {!erreurBase && (<span className="rounded-full border border-card-border bg-muted px-3 py-1 text-xs text-muted-foreground">{aides.length} aide(s)</span>)}
          {!erreurBase && (<AideFormModal membres={membres} dateInitiale={dateInitiale} />)}
        </div>
      </header>
      {erreurBase ? (
        <div role="alert" className="flex gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{erreurBase}</span></div>
      ) : (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="flex flex-col gap-1"><p className="font-semibold">Espace confidentiel</p>
            <p className="text-amber-100/80">Accès réservé aux responsables habilités. Chaque aide attribuée à un membre est aussi visible dans l&apos;onglet « Solidarité » de sa fiche 360°.</p></div>
          </div>
          {aides.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><HeartHandshake className="h-7 w-7 text-muted-foreground" aria-hidden /></span>
              <p className="text-base font-medium text-foreground">Aucune aide enregistrée</p>
              <p className="max-w-md text-sm text-muted-foreground">Enregistrez la première aide avec le bouton « Nouvelle aide ».</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {aides.map((aide) => (
                <li key={aide.id} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-foreground">{aide.motif}</p>
                      <p className="text-xs text-muted-foreground">{aide.dateAffichee} · {aide.beneficiaireNom ? (<Link href={aide.beneficiaireMembreId ? `/membres/${aide.beneficiaireMembreId}` : "#"} className="font-medium text-accent hover:underline">{aide.beneficiaireNom}</Link>) : "Bénéficiaire externe / anonyme"}</p>
                    </div>
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-accent">{aide.montantOuNature}</span>
                  </div>
                  {aide.notesConflictuelles && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                      <span><span className="font-medium text-foreground">Notes (confidentiel) : </span>{aide.notesConflictuelles}</span>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AideFormModal aide={aide} membres={membres} dateInitiale={dateInitiale} triggerLabel="Modifier" />
                    <SupprimerAideButton aideId={aide.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
