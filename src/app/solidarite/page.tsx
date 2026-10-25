import type { Metadata } from "next";
import { CircleAlert, HeartHandshake, Lock } from "lucide-react";
import RegistrePastoralTable from "@/components/solidarite/RegistrePastoralTable";
import RapportActionsBar from "@/components/solidarite/RapportActionsBar";
import GestionSolidarite from "@/components/solidarite/GestionSolidarite";
import type { Membre } from "@/generated/prisma/client";
import { formatMontant, parseDonneesEcclesiastiques } from "@/lib/membre";
import { prisma } from "@/lib/prisma";
import type { FichePastoraleMembre, MembreOption, RegistrePastoralLigne, SyntheseSoutiens } from "@/types/solidarite";
export const metadata: Metadata = { title: "Solidarite et Suivi pastoral", description: "Registre pastoral : synthese des soutiens et tracabilite de chaque fidele." };
export const dynamic = "force-dynamic";
function versISO(date: Date): string { return date.toISOString().slice(0, 10); }
function formatDate(date: Date): string { return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }); }
function classeDe(donnees: Membre["donneesEcclesiastiques"]): string {
const lues = parseDonneesEcclesiastiques(donnees);
const texte = `${lues.statutMembre ?? ""} ${lues.classificationSociale ?? ""}`.toLowerCase();
if (texte.includes("enfant")) return "Enfants";
if (texte.includes("jeune")) return "Jeunes";
if (texte.includes("femme")) return "Femmes";
if (texte.includes("homme")) return "Hommes";
return "Adultes";
}

export default async function SolidaritePage() {
let membres: MembreOption[] = [];
let lignes: RegistrePastoralLigne[] = [];
let fiches: FichePastoraleMembre[] = [];
let synthese: SyntheseSoutiens = { totalAidesDistribuees: 0, nombreFidelesAssistés: 0, montantMoyenParSoutien: 0, nombreDecaissements: 0 };
let erreurBase: string | null = null;
let exerciceLibelle: string = "";
let rapports: any[] = [];

/* État du modal de rapport (remplace l'ancien bouton unique "Nouvelle aide"). */
let rapportOpen = false;
let rapportMembre: MembreOption | null = null;
let rapportMode: "exercice" | "historique" = "exercice";
let rapportExerciceId: string | null = null;

const exercices = await prisma.exercice.findMany({
  orderBy: { createdAt: "desc" },
}).catch(() => []);

try {
const tousMembres = await prisma.membre.findMany({
        orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
        // `photoDataUrl` n'est pas nécessaire ici : on ne sélectionne que les
        // champs utilisés pour le listing, afin de ne pas charger les data URL.
        select: {
          id: true,
          nom: true,
          prenoms: true,
          telephone: true,
          donneesEcclesiastiques: true,
        },
      });
const exercice = exercices.find((e) => !e.cloture) ?? exercices[0] ?? null;
exerciceLibelle = exercice?.libelle ?? "";
const exerciceId: string | null = exercice?.id ?? null;
rapportExerciceId = exerciceId;
const [versements, paiements, depenses] = await Promise.all([
exerciceId ? prisma.versementCotisation.findMany({ where: { cotisation: { exerciceId } }, include: { cotisation: { select: { nom: true } } } }) : Promise.resolve([] as never[]),
exerciceId ? prisma.paiement.findMany({ where: { exerciceId }, include: { typeCotisation: { select: { libelle: true } } } }) : Promise.resolve([] as never[]),
exerciceId ? prisma.depense.findMany({ where: { exerciceId }, include: { caisse: { select: { nom: true } }, cotisation: { select: { nom: true } } }, orderBy: { dateDepense: "desc" } }) : Promise.resolve([] as never[]),
]);
rapports = await prisma.aideDistribution.findMany({
  include: { beneficiaireMembre: true },
  orderBy: { dateDistribution: "desc" },
}).catch(() => []);

membres = tousMembres.map((m) => ({ id: m.id, nom: m.nom, prenoms: m.prenoms, telephone: m.telephone }));
const depensesT = depenses as Array<{ id: string; beneficiaireMembreId: string | null; montant: unknown; libelle: string; description: string | null; dateDepense: Date; numeroPiece: string | null; caisseSource: string; caisse: { nom: string } | null; cotisation: { nom: string } | null }>;
const versementsT = versements as Array<{ id: string; membreId: string | null; montant: unknown; montantBase: unknown; surplusVolontaire: unknown; modePaiement: string; commentaire: string | null; dateEffective: Date; cotisation: { nom: string } | null }>;
const paiementsT = paiements as Array<{ id: string; membreId: string | null; montant: unknown; modePaiement: string; commentaire: string | null; datePaiement: Date; typeCotisation: { libelle: string } | null }>;
const depensesMembres = depensesT.filter((d) => d.beneficiaireMembreId !== null);
const totalAides = depensesMembres.reduce((s, d) => s + Number(d.montant), 0);
const assistes = new Set(depensesMembres.map((d) => String(d.beneficiaireMembreId)));
synthese = { totalAidesDistribuees: totalAides, nombreFidelesAssistés: assistes.size, montantMoyenParSoutien: depensesMembres.length > 0 ? totalAides / depensesMembres.length : 0, nombreDecaissements: depensesMembres.length };
const contributions = new Map<string, { total: number; surplus: number }>();
const parts = new Map<string, FichePastoraleMembre["participations"]>();
for (const v of versementsT) {
if (!v.membreId) continue;
const total = Number(v.montant); const surplus = Number(v.surplusVolontaire ?? 0);
const agg = contributions.get(v.membreId) ?? { total: 0, surplus: 0 };
agg.total += total; agg.surplus += surplus; contributions.set(v.membreId, agg);
const liste = parts.get(v.membreId) ?? [];
liste.push({ id: v.id, dateISO: versISO(v.dateEffective), dateAffichee: formatDate(v.dateEffective), evenement: v.cotisation?.nom ?? "Cotisation", partObligatoire: total - surplus, donAdditionnel: surplus, totalVerse: total, modePaiement: String(v.modePaiement), commentaire: v.commentaire ?? null });
parts.set(v.membreId, liste);
}
for (const p of paiementsT) {
if (!p.membreId) continue;
const total = Number(p.montant);
const agg = contributions.get(p.membreId) ?? { total: 0, surplus: 0 };
agg.total += total; contributions.set(p.membreId, agg);
const liste = parts.get(p.membreId) ?? [];
liste.push({ id: p.id, dateISO: versISO(p.datePaiement), dateAffichee: formatDate(p.datePaiement), evenement: p.typeCotisation?.libelle ?? "Versement", partObligatoire: total, donAdditionnel: 0, totalVerse: total, modePaiement: String(p.modePaiement), commentaire: p.commentaire ?? null });
parts.set(p.membreId, liste);
}
const aidesMap = new Map<string, FichePastoraleMembre["aidesPercues"]>();
const totaux = new Map<string, { total: number; nombre: number }>();
for (const d of depensesMembres) {
const mid = String(d.beneficiaireMembreId); const montant = Number(d.montant);
const agg = totaux.get(mid) ?? { total: 0, nombre: 0 };
agg.total += montant; agg.nombre += 1; totaux.set(mid, agg);
const source = d.cotisation?.nom ?? d.caisse?.nom ?? String(d.caisseSource);
const liste = aidesMap.get(mid) ?? [];
liste.push({ id: d.id, dateISO: versISO(d.dateDepense), dateAffichee: formatDate(d.dateDepense), motif: d.description ? `${d.libelle} — ${d.description}` : d.libelle, caisseOuSource: source, montant, numeroPiece: d.numeroPiece ?? null });
aidesMap.set(mid, liste);
}
lignes = tousMembres.map((m) => {
const c = contributions.get(m.id) ?? { total: 0, surplus: 0 };
const a = totaux.get(m.id) ?? { total: 0, nombre: 0 };
const statut = c.total > 0 && a.total > 0 ? "DONATEUR_ASSISTE" : c.total > 0 ? "DONATEUR" : a.total > 0 ? "ASSISTE" : "NOUVEAU";
return { id: m.id, nom: m.nom, prenoms: m.prenoms, telephone: m.telephone, classe: classeDe(m.donneesEcclesiastiques), totalContributions: c.total, totalSurplus: c.surplus, totalAides: a.total, nombreAides: a.nombre, statut };
});
fiches = tousMembres.map((m) => {
const c = contributions.get(m.id) ?? { total: 0, surplus: 0 };
const a = totaux.get(m.id) ?? { total: 0, nombre: 0 };
return { id: m.id, nom: m.nom, prenoms: m.prenoms, telephone: m.telephone, classe: classeDe(m.donneesEcclesiastiques), totalDonne: c.total, totalSurplus: c.surplus, totalAidesRecues: a.total, participations: (parts.get(m.id) ?? []).sort((x, y) => y.dateISO.localeCompare(x.dateISO)), aidesPercues: (aidesMap.get(m.id) ?? []).sort((x, y) => y.dateISO.localeCompare(x.dateISO)) };
});


} catch (e) {
console.error("Erreur chargement solidarite :", e);
erreurBase = "Impossible de joindre la base. Verifiez DATABASE_URL puis reessayez.";
}

return (
<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
<div className="flex flex-col gap-1">
<p className="text-sm font-medium text-accent">Pastorale</p>
<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Solidarite et Suivi pastoral</h1>
<p className="text-sm text-muted-foreground">Synthese des soutiens et registre de chaque fidele.</p>
</div>
<div className="flex items-center gap-3">
{!erreurBase && (<span className="rounded-full border border-card-border bg-muted px-3 py-1 text-xs text-muted-foreground">{lignes.length} fidele(s)</span>)}
{!erreurBase && (<RapportActionsBar membres={membres ?? []} exercices={exercices ?? []} />)}
</div>
</header>
{erreurBase ? (
<div role="alert" className="flex gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{erreurBase}</span></div>
) : (
<>
<div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
<Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
<div className="flex flex-col gap-1"><p className="font-semibold">Espace confidentiel</p>
<p className="text-amber-100/80">Acces reserve ADMIN, PASTEUR, RESPONSABLE, TRESORIER. Route ouverte a la session active.</p></div>
</div>
<section aria-label="Synthese des soutiens" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
<div className="flex flex-col gap-1 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4">
<span className="text-xs font-medium uppercase tracking-wide text-accent">Total des aides distribuees</span>
<span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(synthese.totalAidesDistribuees)} FCFA</span>
<span className="text-xs text-muted-foreground">{synthese.nombreDecaissements} decaissement(s)</span>
</div>
<div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fideles assistes</span>
<span className="text-xl font-semibold tabular-nums text-foreground">{synthese.nombreFidelesAssistés}</span>
<span className="text-xs text-muted-foreground">beneficiaires distincts</span>
</div>
<div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Montant moyen par soutien</span>
<span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(Math.round(synthese.montantMoyenParSoutien))} FCFA</span>
<span className="text-xs text-muted-foreground">moyenne par aide</span>
</div>
</section>
<section aria-label="Registre pastoral" className="flex flex-col gap-4">
<div className="flex items-center gap-2">
<HeartHandshake className="h-5 w-5 text-accent" aria-hidden />
<h2 className="text-base font-semibold text-foreground">Registre pastoral — tous les fideles</h2>
</div>
<RegistrePastoralTable lignes={lignes} fiches={fiches} membres={membres ?? []} exercices={exercices ?? []} />
</section>
<section aria-label="Rapport individuel">
<GestionSolidarite membres={membres ?? []} items={rapports ?? []} exerciceLibelle={exerciceLibelle} />
</section>
</>
)}
</div>
);
}
