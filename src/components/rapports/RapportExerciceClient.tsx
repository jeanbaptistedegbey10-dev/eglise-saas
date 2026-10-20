"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SupprimerExerciceBouton from "@/components/finances/SupprimerExerciceBouton";
import RapportFiltres from "./RapportFiltres";
import RapportGlobal from "./RapportGlobal";
import RapportRegistre from "./RapportRegistre";
import RapportCotisationDetailShell from "./RapportCotisationDetailShell";
import SuiviRecurrentes, { type RecurrenteLigne } from "./SuiviRecurrentes";
import { classeDe } from "./classe";
import { TOUTES, TYPES_FILTRE } from "./types";

import type { CotisationRapportOption, ExerciceSelectOption, KpiExercice, VersementRapportLigne } from "./types";

type Props = {
  exercices: ExerciceSelectOption[];
  exerciceId: string;
  exerciceLibelle: string;
  exerciceCloture: boolean;
  cotisations: CotisationRapportOption[];
  versements: VersementRapportLigne[];
  kpi: KpiExercice;
  typeInitial: string;
  cotisationInitiale: string;
};
export default function RapportExerciceClient(p: Props) {
  const router = useRouter();
  const [typeFiltre, setTypeFiltre] = useState(TYPES_FILTRE.some((t) => t.value === p.typeInitial) ? p.typeInitial : TOUTES);
  const [cotisationId, setCotisationId] = useState(p.cotisationInitiale || TOUTES);
  const [recherche, setRecherche] = useState("");
  // Onglet principal — "Cotisations Récurrentes & Suivi" par défaut pour visibilité immédiate.
  const [onglet, setOnglet] = useState<"recurrentes" | "global">("recurrentes");
  const cotisationsDuType = useMemo(() => (typeFiltre === TOUTES ? p.cotisations : p.cotisations.filter((c) => c.type === typeFiltre)), [p.cotisations, typeFiltre]);
  const effective = cotisationId !== TOUTES && cotisationsDuType.some((c) => c.id === cotisationId) ? cotisationId : TOUTES;
  const selectionnee = useMemo(() => (effective !== TOUTES ? (p.cotisations.find((c) => c.id === effective) ?? null) : null), [p.cotisations, effective]);
  const changerType = (t: string) => { setTypeFiltre(t); setCotisationId(TOUTES); };
  const reset = () => { setTypeFiltre(TOUTES); setCotisationId(TOUTES); setRecherche(""); };
  const versementsFiltres = useMemo(() => {
    let base = p.versements;
    if (selectionnee) base = base.filter((v) => v.cotisationId === selectionnee.id);
    else if (typeFiltre !== TOUTES) base = base.filter((v) => v.cotisationType === typeFiltre);
    const terme = recherche.trim().toLowerCase();
    if (!terme) return base;
    return base.filter((v) => `${v.membrePrenoms} ${v.membreNom} ${v.cotisationNom}`.toLowerCase().includes(terme));
  }, [p.versements, selectionnee, typeFiltre, recherche]);
  const synthese = useMemo(() => {
    if (!selectionnee) return null;
    const lignes = p.versements.filter((v) => v.cotisationId === selectionnee.id);
    const totalCollecte = lignes.reduce((s, v) => s + v.montant, 0);
    const totalSurplus = lignes.reduce((s, v) => s + v.surplus, 0);
    const totalBase = lignes.reduce((s, v) => s + v.montantBase, 0);
    const parts = new Set(lignes.filter((v) => v.membreId).map((v) => v.membreId as string));
    let objectif: number | null = null;
    if (selectionnee.montantCible != null && selectionnee.montantCible > 0) objectif = selectionnee.montantCible;
    else if (selectionnee.montantPlancher != null && selectionnee.montantPlancher > 0) objectif = Math.round(selectionnee.montantPlancher * Math.max(1, parts.size || lignes.length) * 100) / 100;
    const taux = objectif ? (totalCollecte / objectif) * 100 : null;
    const reste = objectif != null ? Math.max(0, Math.round((objectif - totalCollecte) * 100) / 100) : null;
    return { totalCollecte, totalSurplus, totalBase, nombreVersements: lignes.length, nombreParticipants: parts.size, objectif, taux, reste };
  }, [p.versements, selectionnee]);
  const grandLivre = useMemo(() => {
    const carte = new Map<string, { membreId: string; nom: string; prenoms: string; telephone: string | null; classe: string; total: number; surplus: number; nombre: number; dernier: string | null }>();
    for (const v of versementsFiltres) {
      if (!v.membreId) continue;
      const e = carte.get(v.membreId) ?? { membreId: v.membreId, nom: v.membreNom, prenoms: v.membrePrenoms, telephone: v.membreTelephone, classe: classeDe(v), total: 0, surplus: 0, nombre: 0, dernier: null };
      e.total += v.montant; e.surplus += v.surplus; e.nombre += 1;
      const d = v.dateEffective ?? v.dateVersement ?? null;
      if (d && (!e.dernier || d > e.dernier)) e.dernier = d;
      carte.set(v.membreId, e);
    }
    return [...carte.values()].sort((a, b) => b.total - a.total);
  }, [versementsFiltres]);
  const lignesRecurrentes: RecurrenteLigne[] = useMemo(() => {
    // Cotisations récurrentes connues pour l'exercice courant…
    const recs = p.cotisations.filter((c) => c.type === "RECURRENTE_CLASSE");
    const parId = new Map(recs.map((c) => [c.id, c]));
    const agg = new Map<string, RecurrenteLigne>();
    // …mais en l'absence d'exercice / de définition, on bascule en mode global :
    // tout versement dont le type est RECURRENTE_CLASSE est agrégé pour ne jamais masquer la section.
    for (const v of p.versements) {
      const cot = parId.get(v.cotisationId);
      const estRecurrent = !!cot || v.cotisationType === "RECURRENTE_CLASSE";
      if (!estRecurrent || !v.membreId) continue;
      const nomCotisation = cot?.nom ?? v.cotisationNom;
      const cle = v.membreId + "|" + v.cotisationId;
      const e = agg.get(cle) ?? { membreId: v.membreId, nom: v.membreNom, prenoms: v.membrePrenoms, telephone: v.membreTelephone, cotisationId: v.cotisationId, cotisationNom: nomCotisation, attendu: 0, paye: 0, du: 0, etat: "EN_RETARD", versements: [] };
      e.paye += v.montant;
      e.versements.push({ id: v.id, date: (v.dateEffective ?? v.dateVersement ?? null), montant: v.montant });
      agg.set(cle, e);
    }
    const baremePour = (cotId: string, cible: string): number => {
      const cot = parId.get(cotId);
      if (!cot) return 0;
      const b = cot.baremes.find((x) => x.cible === cible) ?? cot.baremes.find((x) => x.cible === "TOUS") ?? cot.baremes[0] ?? null;
      return Number(b?.montant ?? cot.montantPlancher ?? 0);
    };
    const carteMembre = new Map(p.versements.filter((v) => v.membreId).map((v) => [v.membreId as string, { classe: classeDe(v), cible: "TOUS" }]));
    const out: RecurrenteLigne[] = [];
    for (const e of agg.values()) {
      const mensuel = baremePour(e.cotisationId, "TOUS");
      e.attendu = mensuel > 0 ? Math.round(mensuel * 12 * 100) / 100 : Math.round(e.paye * 100) / 100;
      e.du = Math.max(0, Math.round((e.attendu - e.paye) * 100) / 100);
      e.etat = e.du <= 0 ? "A_JOUR" : e.paye > 0 ? "PARTIEL" : "EN_RETARD";
      e.versements.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      out.push(e);
    }
    void carteMembre;
    return out.sort((a, b) => b.du - a.du);
  }, [p.cotisations, p.versements]);
  return (
    <div className="flex flex-col gap-6">
      <RapportFiltres exercices={p.exercices} exerciceId={p.exerciceId} typeFiltre={typeFiltre} cotisationId={effective} recherche={recherche} cotisationsDuType={cotisationsDuType} onExercice={(id) => router.push(`/rapports?exercice=${encodeURIComponent(id)}`)} onType={changerType} onCotisation={setCotisationId} onRecherche={setRecherche} onReset={reset} />
      {p.exerciceCloture && (<p className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-300">Exercice cloture - lecture seule</p>)}
      {/* Barre d'onglets principale — accès direct et bien visible au suivi récurrent. */}
      {!selectionnee && (
        <div role="tablist" aria-label="Onglets rapports" className="no-print flex flex-wrap gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={onglet === "recurrentes"}
            onClick={() => setOnglet("recurrentes")}
            className={onglet === "recurrentes"
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
              : "inline-flex items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"}
          >
            Cotisations Récurrentes & Suivi ({lignesRecurrentes.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={onglet === "global"}
            onClick={() => setOnglet("global")}
            className={onglet === "global"
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
              : "inline-flex items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"}
          >
            Synthèse & Grand Livre
          </button>
        </div>
      )}
      {selectionnee && synthese ? (<><RapportCotisationDetailShell cotisation={selectionnee} synthese={synthese} /><RapportRegistre lignes={versementsFiltres.filter((v) => v.cotisationId === selectionnee.id)} recherche={recherche} /></>) : onglet === "recurrentes" ? (<><SuiviRecurrentes lignes={lignesRecurrentes} exerciceLibelle={p.exerciceLibelle} /><RapportGlobal kpi={p.kpi} exerciceLibelle={p.exerciceLibelle} typeLabel={typeFiltre} lignes={grandLivre} /></>) : (<><RapportGlobal kpi={p.kpi} exerciceLibelle={p.exerciceLibelle} typeLabel={typeFiltre} lignes={grandLivre} /><SuiviRecurrentes lignes={lignesRecurrentes} exerciceLibelle={p.exerciceLibelle} /></>)}
      {p.exerciceId && (
      <section aria-label="Zone de danger" className="no-print rounded-2xl border border-dashed border-red-500/30 bg-card/60 px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zone de danger - Administration</h2>
            <p className="text-xs text-muted-foreground">Suppression definitive de l exercice, donnees rattachees incluses.</p>
          </div>
          <SupprimerExerciceBouton exerciceId={p.exerciceId} exerciceLibelle={p.exerciceLibelle} />
        </div>
      </section>
      )}
    </div>
  );
}
