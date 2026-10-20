"use client";

import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, CircleAlert, Coins, LoaderCircle, Search, X } from "lucide-react";

import { enregistrerVersementCotisation } from "@/actions/cotisation";
import {
  grilleParAge,
  grilleParSexe,
  libelleCible,
  periodesParMois,
  selectionnerBareme,
  typeMontantLibre,
} from "@/lib/cotisation";
import { formatDateISO } from "@/lib/membre";
import { MODES_PAIEMENT, formatMontant } from "@/lib/finance";
import { montantRecurrent, repartitionMontant } from "@/lib/versement-cotisation";
import type { MoisExercice } from "@/lib/mois";
import {
  initialCotisationFormState,
  type CotisationPourVersement,
  type MembrePourVersement,
} from "@/types/cotisation";
import type { FrequenceCotisation } from "@/generated/prisma/client";

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

/** Libellé court de la tranche d'un membre (Adulte / Jeune / Enfant…). */
function libelleTranche(item: MembrePourVersement): string {
  if (item.cible === "ADULTE") return "Adulte";
  if (item.cible === "JEUNE") return "Jeune";
  if (item.cible === "ENFANT") return "Enfant";
  return String(item.cible ?? "");
}

type Props = {
  cotisations: CotisationPourVersement[];
  membres: MembrePourVersement[];
  /** Mois de l'exercice (ordre chronologique, passage à l'an géré). */
  mois: MoisExercice[];
  /** Aujourd'hui, calculé côté serveur (cohérence d'hydratation). */
  dateInitiale: string;
  exerciceCloture: boolean;
  /** Cotisation pré-sélectionnée via l'URL. */
  cotisationInitiale?: string | null;
};

/**
 * Onglet « Enregistrement des versements » : sélecteur de cotisation active,
 * puis formulaire adapté à la nature sélectionnée :
 *  • récurrente  → grille de mois cliquables (pastilles vertes = déjà payés) et
 *    tarif automatique selon la classe du membre ;
 *  • ponctuelle  → plancher obligatoire détecté depuis le barème de la classe du
 *    membre + découpage temps réel du surplus volontaire ;
 *  • anonyme / travaux / quête → montant libre, donateur facultatif, date du
 *    culte / versement et commentaire optionnel.
 */
export default function VersementCotisationForm({
  cotisations,
  membres,
  mois,
  dateInitiale,
  exerciceCloture,
  cotisationInitiale,
}: Props) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(
    enregistrerVersementCotisation,
    initialCotisationFormState,
  );

  const [cotisationId, setCotisationId] = useState(
    cotisationInitiale && cotisations.some((cotisation) => cotisation.id === cotisationInitiale)
      ? cotisationInitiale
      : (cotisations[0]?.id ?? ""),
  );
  const [membreId, setMembreId] = useState("");
  // ComboBox « Membre » : recherche temps réel par nom, prénom ou téléphone
  // (remplace le menu déroulant natif difficile à parcourir avec beaucoup de membres).
  const [rechercheMembre, setRechercheMembre] = useState("");
  const [listeMembresOuverte, setListeMembresOuverte] = useState(false);
  const comboboxMembreRef = useRef<HTMLDivElement>(null);
  const [moisCoches, setMoisCoches] = useState<string[]>([]);
  const [montant, setMontant] = useState("");
  const [surplusSaisi, setSurplusSaisi] = useState("");
  const [dateEffective, setDateEffective] = useState(dateInitiale);
  const [modePaiement, setModePaiement] = useState("ESPECES");
  const [estAnonyme, setEstAnonyme] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  // Récurrente : « Exonérer les mois antérieurs à l'arrivée » — un membre
  // arrivé en cours d'année peut régler le mois courant sans solder les
  // arriérés des mois précédents (nouveau membre).
  const [exonererAnterieurs, setExonererAnterieurs] = useState(false);

  const cotisation =
    cotisations.find((item) => item.id === cotisationId) ?? cotisations[0] ?? null;
  const membre = membres.find((item) => item.id === membreId) ?? null;

  // Filtrage temps réel de l'annuaire : nom, prénom (libellé) ou téléphone,
  // les espaces étant ignorés pour la comparaison des numéros.
  const membresFiltres = useMemo(() => {
    const terme = rechercheMembre.trim().toLowerCase();
    if (terme === "") return membres;
    const termeTel = terme.replace(/[^0-9+]/g, "");
    return membres.filter(
      (item) =>
        item.label.toLowerCase().includes(terme) ||
        (termeTel !== "" && item.telephone.replace(/[^0-9+]/g, "").includes(termeTel)),
    );
  }, [membres, rechercheMembre]);

  // Ferme la liste déroulante lors d'un clic extérieur au combobox.
  useEffect(() => {
    if (!listeMembresOuverte) return;
    const fermerSiExterieur = (evenement: MouseEvent) => {
      if (
        comboboxMembreRef.current &&
        !comboboxMembreRef.current.contains(evenement.target as Node)
      ) {
        setListeMembresOuverte(false);
      }
    };
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, [listeMembresOuverte]);

  // Réinitialise la saisie quand la cotisation active change.
  useEffect(() => {
    setMembreId("");
    setRechercheMembre("");
    setListeMembresOuverte(false);
    setMoisCoches([]);
    setMontant("");
    setSurplusSaisi("");
    setEstAnonyme(false);
    setExonererAnterieurs(false);
  }, [cotisationId]);

  // Réinitialise les mois cochés quand le membre change (historique différent).
  useEffect(() => {
    setMoisCoches([]);
    setExonererAnterieurs(false);
  }, [membreId]);

  useEffect(() => {
    if (!etat.success) return;
    setMoisCoches([]);
    setMontant("");
    setSurplusSaisi("");
    setCommentaire("");
    setExonererAnterieurs(false);
    router.refresh();
  }, [etat, router]);

  // Tarif automatique : on respecte le mode réel de la grille.
  //  • grille par ÂGE (ADULTE / JEUNE / ENFANT) → classe d'âge du membre,
  //  • grille par SEXE (HOMME / FEMME) → sexe du membre,
  //  • barème global unique → ce montant (pas de forçage Homme/Femme).
  const profilMembre = useMemo(
    () =>
      membre
        ? {
            classificationSociale:
              membre.classeAge ??
              (membre.cible === "ADULTE" || membre.cible === "JEUNE" || membre.cible === "ENFANT"
                ? membre.cible
                : null),
            sexe: membre.sexe,
            typePersonne: membre.typePersonne ?? null,
            civilite: null as string | null,
            dateNaissance: null as string | null,
            age: null as number | null,
          }
        : null,
    [membre],
  );

  const baremeApplique = useMemo(() => {
    if (!cotisation || !membre) return null;
    return selectionnerBareme(cotisation.baremes, membre.cible, profilMembre);
  }, [cotisation, membre, profilMembre]);

  const detailBareme = useMemo(() => {
    if (!cotisation || baremeApplique == null) return null;
    const baremes = cotisation.baremes;
    if (baremes.length === 1 || (!grilleParAge(baremes) && !grilleParSexe(baremes))) {
      return { etiquette: "Barème global", cible: baremeApplique.cible };
    }
    if (grilleParAge(baremes) && !grilleParSexe(baremes)) {
      return {
        etiquette: membre?.typePersonne
          ? membre.typePersonne.toUpperCase() === "VISITEUR"
            ? "Visiteur (don libre)"
            : libelleCible(membre.typePersonne.toUpperCase())
          : membre?.classeAge
            ? libelleCible(membre.classeAge)
            : libelleCible(baremeApplique.cible),
        cible: baremeApplique.cible,
      };
    }
    if (grilleParSexe(baremes) && !grilleParAge(baremes)) {
      return {
        etiquette: membre?.sexe ? libelleCible(membre.sexe) : libelleCible(baremeApplique.cible),
        cible: baremeApplique.cible,
      };
    }
    return { etiquette: libelleCible(baremeApplique.cible), cible: baremeApplique.cible };
  }, [cotisation, baremeApplique, membre]);

  // Tarif automatique du membre selon sa classe (Adulte / Jeune / Enfant…).
  const tarifMensuel = useMemo(() => {
    if (!cotisation || !membre || !baremeApplique) return null;
    return baremeApplique.montant * periodesParMois(cotisation.frequence as FrequenceCotisation);
  }, [cotisation, membre, baremeApplique]);

  const totalAttendu = useMemo(() => {
    if (tarifMensuel === null) return 0;
    return montantRecurrent(tarifMensuel, moisCoches.length);
  }, [tarifMensuel, moisCoches.length]);

  // Découpage temps réel part obligatoire / surplus (cotisation ponctuelle).
  // Total enregistré = plancher obligatoire + surplus volontaire saisi.
  const estPonctuelle = cotisation?.type === "PONCTUELLE_EVENEMENT";
  const surplusAutorise = cotisation?.autoriserSurplus === true;
  // Natures à montant libre (travaux / projets, quête de culte) : le donateur
  // est facultatif et le montant est saisi directement.
  const donateurFacultatif = typeMontantLibre(cotisation?.type ?? "");
  // Plancher d'une ponctuelle = barème de la classe du membre sélectionné
  // (ex. Adulte 5 000 FCFA). Repli sur le plancher global stocké si le membre
  // n'est pas encore choisi ou si la classe n'a pas de barème dédié.
  const plancher = useMemo(() => {
    if (!estPonctuelle || !cotisation) return null;
    if (baremeApplique) return baremeApplique.montant;
    return cotisation.montantPlancher ?? null;
  }, [estPonctuelle, cotisation, baremeApplique]);
  // Sans surplus autorisé : montant fixé au plancher (pas de saisie libre).
  // Avec surplus : plancher coché par défaut + champ optionnel de don additionnel.
  const surplusSaisiNombre = Number(surplusSaisi.replace(",", ".")) || 0;
  const totalSaisi = estPonctuelle
    ? (plancher ?? 0) + (surplusAutorise ? Math.max(0, surplusSaisiNombre) : 0)
    : Number(montant.replace(",", ".")) || 0;
  const repartition = repartitionMontant(
    totalSaisi,
    estPonctuelle ? plancher : null,
  );

  // Mois déjà réglés par le membre sur la cotisation active (pastilles vertes).
  const moisRegles = useMemo(() => {
    if (!cotisation || !membre) return new Map<string, string>();
    const table = new Map<string, string>();
    for (const paye of cotisation.moisPayes[membre.id] ?? []) {
      table.set(paye.cle, paye.date);
    }
    return table;
  }, [cotisation, membre]);

  const basculerMois = (cle: string) => {
    if (moisRegles.has(cle)) return;
    const index = mois.findIndex((item) => item.cle === cle);
    if (index === -1) return;
    setMoisCoches((precedent) => {
      // Décocher : retire le mois et tous les mois suivants cochés (cascade),
      // pour préserver l'ordre chronologique sans trou.
      if (precedent.includes(cle)) {
        const aConserver = new Set(
          mois
            .slice(0, index)
            .map((item) => item.cle)
            .filter((c) => precedent.includes(c)),
        );
        return precedent.filter((item) => aConserver.has(item));
      }
      // Cocher : ordre chronologique obligatoire — interdit de sauter un mois
      // non payé. Le mois N n'est cochable que si tous les mois précédents
      // sont déjà réglés ou déjà cochés. L'exemption « mois antérieurs »
      // (nouveau membre) saute ce contrôle.
      if (!exonererAnterieurs) {
        for (const anterieur of mois.slice(0, index)) {
          if (!moisRegles.has(anterieur.cle) && !precedent.includes(anterieur.cle)) {
            return precedent;
          }
        }
      }
      const selection = [...precedent, cle];
      // Trie dans l'ordre chronologique de l'exercice.
      const ordre = new Map(mois.map((item, i) => [item.cle, i] as const));
      selection.sort((a, b) => (ordre.get(a) ?? 0) - (ordre.get(b) ?? 0));
      return selection;
    });
  };

  // Un mois non réglé n'est cliquable que si tous les mois précédents sont
  // réglés ou cochés (pas de saut d'arriérés). Sauf exemption « mois antérieurs »
  // pour un nouveau membre.
  const moisCliquable = (cle: string): boolean => {
    if (moisRegles.has(cle)) return false;
    const index = mois.findIndex((item) => item.cle === cle);
    if (index === -1) return false;
    if (exonererAnterieurs) return true;
    return mois.slice(0, index).every(
      (anterieur) =>
        moisRegles.has(anterieur.cle) || moisCoches.includes(anterieur.cle),
    );
  };

  const erreurDe = (champ: string): string | undefined => etat.fieldErrors[champ]?.[0];

  const moisPayload = JSON.stringify(moisCoches);
  // Récurrente : total automatique = nouveaux mois cochés × tarif unitaire.
  // Ponctuelle : total = plancher obligatoire + surplus volontaire.
  const montantPayload =
    cotisation?.type === "RECURRENTE_CLASSE"
      ? String(totalAttendu)
      : estPonctuelle
        ? String(totalSaisi)
        : montant.trim() === ""
          ? "0"
          : montant;
  const soumissionPossible =
    !exerciceCloture &&
    cotisation != null &&
    !cotisation.estCloture &&
    (cotisation.type === "RECURRENTE_CLASSE"
      ? membreId !== "" && moisCoches.length > 0
      : cotisation.type === "PONCTUELLE_EVENEMENT"
        ? membreId !== "" && totalSaisi > 0
        : totalSaisi > 0);

  if (cotisations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
        <Coins className="h-7 w-7 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Créez d&apos;abord une cotisation dans l&apos;onglet « Types de cotisations &amp;
          barèmes ».
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="cotisationId" value={cotisation?.id ?? ""} readOnly />
      <input type="hidden" name="moisCoches" value={moisPayload} readOnly />
      <input type="hidden" name="montant" value={montantPayload} readOnly />
      {/* Exemption « mois antérieurs » — uniquement utile sur une récurrente. */}
      <input
        type="hidden"
        name="exonererAnterieurs"
        value={exonererAnterieurs ? "on" : ""}
        readOnly
      />
      <input
        type="hidden"
        name="membreId"
        value={estAnonyme ? "" : membreId}
        readOnly
      />

      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-accent" aria-hidden />
        <h3 className="text-base font-semibold text-foreground">
          Enregistrer un versement
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {cotisations.length} cotisation{cotisations.length > 1 ? "s" : ""} disponible
          {cotisations.length > 1 ? "s" : ""}
        </span>
      </div>

      {!etat.success && etat.message && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{etat.message}</span>
        </div>
      )}
      {etat.success && etat.message && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{etat.message}</span>
        </div>
      )}
      {(exerciceCloture || cotisation?.estCloture) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {exerciceCloture
              ? "L'exercice est clôturé : la saisie est en lecture seule."
              : `La cotisation « ${cotisation.nom} » est clôturée : rouvrez-la dans l'onglet « Types de cotisations ».`}
          </span>
        </div>
      )}

      {/* Sélecteur de la cotisation active */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="versement-cotisation" className="text-sm font-medium text-foreground">
          Cotisation active<span className="ml-1 text-red-400">*</span>
        </label>
        <select
          id="versement-cotisation"
          value={cotisationId}
          onChange={(evenement) => setCotisationId(evenement.target.value)}
          className={clsx(INPUT_BASE, "h-10")}
        >
          {cotisations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nom} —{" "}
              {item.type === "RECURRENTE_CLASSE"
                ? "récurrente"
                : item.type === "PONCTUELLE_EVENEMENT"
                  ? "ponctuelle"
                  : item.type === "QUETE_CULTE"
                    ? "quête"
                    : "anonyme / travaux"}
              {item.estCloture ? " (clôturée)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Sélection du membre */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="versement-membre" className="text-sm font-medium text-foreground">
          {donateurFacultatif ? "Donateur (facultatif)" : "Membre"}
          {!donateurFacultatif && (
            <span className="ml-1 text-red-400">*</span>
          )}
        </label>
        <div ref={comboboxMembreRef} className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="versement-membre"
            type="text"
            role="combobox"
            aria-expanded={listeMembresOuverte}
            aria-controls="versement-membre-liste"
            aria-autocomplete="list"
            autoComplete="off"
            disabled={estAnonyme}
            // Hors recherche : affiche le membre sélectionné ; pendant la saisie : la saisie brute.
            value={listeMembresOuverte ? rechercheMembre : (membre?.label ?? "")}
            onChange={(evenement) => {
              setRechercheMembre(evenement.target.value);
              setListeMembresOuverte(true);
            }}
            onFocus={() => {
              setRechercheMembre("");
              setListeMembresOuverte(true);
            }}
            onKeyDown={(evenement) => {
              if (evenement.key === "Escape") setListeMembresOuverte(false);
            }}
            placeholder={
              donateurFacultatif
                ? "Nom, prénom ou téléphone du donateur…"
                : "Tapez le nom, le prénom ou le téléphone…"
            }
            aria-invalid={erreurDe("membreId") ? true : undefined}
            className={clsx(
              INPUT_BASE,
              "h-10 pl-9 pr-9",
              erreurDe("membreId") && "border-red-500/70 focus:border-red-500 focus:ring-red-500/30",
            )}
          />
          {membre && !estAnonyme && (
            <button
              type="button"
              onClick={() => {
                setMembreId("");
                setRechercheMembre("");
              }}
              aria-label="Retirer le membre sélectionné"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          {listeMembresOuverte && !estAnonyme && (
            <div
              id="versement-membre-liste"
              role="listbox"
              className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-card-border bg-card py-1 shadow-lg"
            >
              {membresFiltres.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Aucun membre ne correspond à cette recherche.
                </p>
              ) : (
                membresFiltres.slice(0, 50).map((item) => {
                  // Ponctuelle : paiement unique — le membre ayant déjà réglé est
                  // désactivé (badge « ✓ Déjà réglé »), même contrôle côté serveur.
                  const dejaRegle =
                    cotisation?.type === "PONCTUELLE_EVENEMENT" &&
                    (cotisation?.membresRegles ?? []).includes(item.id);
                  const selectionne = item.id === membreId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selectionne}
                      disabled={dejaRegle}
                      onClick={() => {
                        setMembreId(item.id);
                        setRechercheMembre("");
                        setListeMembresOuverte(false);
                      }}
                      className={clsx(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none",
                        selectionne ? "bg-primary/10 text-foreground" : "text-foreground hover:bg-muted",
                        dejaRegle && "cursor-not-allowed opacity-60 hover:bg-transparent",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {libelleTranche(item)} · {item.telephone}
                        </span>
                      </span>
                      {dejaRegle ? (
                        <span className="shrink-0 text-xs text-emerald-300">✓ Déjà réglé</span>
                      ) : selectionne ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      ) : null}
                    </button>
                  );
                })
              )}
              <p className="border-t border-card-border px-3 py-1.5 text-[11px] text-muted-foreground">
                {membresFiltres.length} membre(s) — recherche par nom, prénom ou téléphone.
              </p>
            </div>
          )}
        </div>
        {erreurDe("membreId") && (
          <p className="text-xs text-red-400">{erreurDe("membreId")}</p>
        )}
      </div>

      {/* --- Récurrente : grille interactive des mois de l'exercice --- */}
      {cotisation?.type === "RECURRENTE_CLASSE" && (
        <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              Mois de l&apos;exercice
            </span>
            <span className="text-xs text-muted-foreground">
              {!membre
                ? "Sélectionnez un membre pour afficher sa grille."
                : tarifMensuel != null && detailBareme
                  ? `Barème appliqué : ${detailBareme.etiquette} — ${formatMontant(tarifMensuel)} FCFA / mois`
                  : "Aucun barème pour sa classe."}
            </span>
          </div>

          {membre && (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {mois.map((item) => {
                  const datePayee = moisRegles.get(item.cle);
                  const coche = moisCoches.includes(item.cle);
                  const estRegle = datePayee !== undefined;
                  const cliquable = !estRegle && moisCliquable(item.cle);

                  return (
                    <button
                      key={item.cle}
                      type="button"
                      onClick={() => basculerMois(item.cle)}
                      disabled={!cliquable && !coche}
                      aria-pressed={coche}
                      title={
                        estRegle
                          ? `Réglé le ${formatDateISO(datePayee!.slice(0, 10))}`
                          : coche
                            ? `${item.libelle} — coché`
                            : cliquable
                              ? `Cocher ${item.libelle}`
                              : `${item.libelle} — réglez d'abord les mois précédents`
                      }
                      className={clsx(
                        "flex flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
                        datePayee !== undefined
                          ? "cursor-default border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                          : coche
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-card-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-50",
                      )}
                    >
                      <span className="font-medium">{item.libelle.slice(0, 3)}</span>
                      <span className="text-[10px] tabular-nums opacity-80">
                        {datePayee !== undefined
                          ? "Réglé"
                          : coche
                            ? "coché"
                            : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Exemption pour nouveau membre : autorise à cocher le mois
                  courant sans solder les mois antérieurs non réglés. */}
              <label className="flex items-start gap-2.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
                <input
                  type="checkbox"
                  checked={exonererAnterieurs}
                  onChange={(evenement) => setExonererAnterieurs(evenement.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
                />
                <span>
                  <span className="font-medium">
                    Exonérer les mois antérieurs à l&apos;arrivée
                  </span>
                  <span className="block text-amber-200/80">
                    Nouveau membre en cours d&apos;année : cochez le mois courant sans devoir
                    régler les mois précédents (les mois déjà réglés restent bloqués).
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {moisCoches.length} mois sélectionné{moisCoches.length > 1 ? "s" : ""}
                  {moisRegles.size > 0 &&
                    ` · ${moisRegles.size} déjà réglé${moisRegles.size > 1 ? "s" : ""}`}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  Total calculé : {formatMontant(totalAttendu)} FCFA
                </span>
              </div>

              {erreurDe("moisCoches") && (
                <p className="text-xs text-red-400">{erreurDe("moisCoches")}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* --- Ponctuelle : plancher obligatoire + surplus en temps réel --- */}
      {cotisation?.type === "PONCTUELLE_EVENEMENT" && (
        <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-muted/20 p-4">
          {/* Montant obligatoire fixé, coché par défaut (pas de saisie libre). */}
          <label className="flex items-start gap-2.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5">
            <input
              type="checkbox"
              checked
              readOnly
              disabled
              aria-label="Montant plancher obligatoire"
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="flex flex-1 flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                Montant plancher obligatoire :{" "}
                {plancher != null ? `${formatMontant(plancher)} FCFA` : "Non défini"}
              </span>
              {membre && detailBareme && plancher != null && (
                <span className="text-xs text-muted-foreground">
                  Barème appliqué : {detailBareme.etiquette} — {formatMontant(plancher)} FCFA
                </span>
              )}
            </span>
          </label>

          {/* Erreur serveur « aucun plancher défini pour la classe » (champ montantPlancher). */}
          {erreurDe("montantPlancher") && (
            <p className="text-xs text-red-400">{erreurDe("montantPlancher")}</p>
          )}

          {/* Champ optionnel séparé : surplus / don volontaire additionnel. */}
          {surplusAutorise ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="versement-surplus"
                className="text-sm font-medium text-foreground"
              >
                Surplus / Don volontaire additionnel (FCFA)
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  — facultatif
                </span>
              </label>
              <input
                id="versement-surplus"
                type="text"
                inputMode="decimal"
                value={surplusSaisi}
                onChange={(evenement) => setSurplusSaisi(evenement.target.value)}
                placeholder="Ex. 5000"
                aria-invalid={erreurDe("montant") ? true : undefined}
                className={clsx(INPUT_BASE, "h-10 tabular-nums")}
              />
              {erreurDe("montant") && (
                <p className="text-xs text-red-400">{erreurDe("montant")}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Cette cotisation n&apos;autorise pas le surplus : seul le montant
              obligatoire fixé sera enregistré.
            </p>
          )}

          {totalSaisi > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col rounded-xl border border-card-border bg-background px-4 py-3">
                <span className="text-xs text-muted-foreground">Part obligatoire</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {formatMontant(repartition.base)} FCFA
                </span>
              </div>
              <div className="flex flex-col rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                <span className="text-xs text-emerald-300">Don additionnel / Surplus</span>
                <span className="text-lg font-semibold tabular-nums text-emerald-300">
                  {formatMontant(repartition.surplus)} FCFA
                </span>
              </div>
              <div className="flex flex-col rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
                <span className="text-xs text-muted-foreground">Total enregistré</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {formatMontant(repartition.total)} FCFA
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Travaux / projets & quête de culte : montant libre --- */}
      {donateurFacultatif && (
        <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-muted/20 p-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="versement-montant"
              className="text-sm font-medium text-foreground"
            >
              {cotisation?.type === "QUETE_CULTE"
                ? "Montant collecté (FCFA)"
                : "Montant remis (FCFA)"}
              <span className="ml-1 text-red-400">*</span>
            </label>
            <input
              id="versement-montant"
              type="text"
              inputMode="decimal"
              value={montant}
              onChange={(evenement) => setMontant(evenement.target.value)}
              placeholder="Ex. 25000"
              aria-invalid={erreurDe("montant") ? true : undefined}
              className={clsx(INPUT_BASE, "h-10 tabular-nums")}
            />
            {erreurDe("montant") && (
              <p className="text-xs text-red-400">{erreurDe("montant")}</p>
            )}
            {cotisation?.type === "QUETE_CULTE" ? (
              <p className="text-xs text-muted-foreground">
                Quête de culte : saisissez le montant total collecté (offrandes libres,
                sans barème imposé).
              </p>
            ) : (
              cotisation?.montantCible != null && (
                <p className="text-xs text-muted-foreground">
                  Cible de la campagne : {formatMontant(cotisation.montantCible)} FCFA —
                  déjà {formatMontant(cotisation.totalVerse)} FCFA récoltés.
                </p>
              )
            )}
          </div>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              name="estAnonyme"
              checked={estAnonyme}
              onChange={(evenement) => setEstAnonyme(evenement.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Anonyme</span>
              <span className="text-xs text-muted-foreground">
                Le nom du donateur n&apos;apparaîtra dans aucun rapport.
              </span>
            </span>
          </label>
        </div>
      )}

      {/* --- Informations communes --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="versement-date"
            className="text-sm font-medium text-foreground"
          >
            {cotisation?.type === "QUETE_CULTE"
              ? "Date du culte / collecte"
              : "Date effective du paiement"}
          </label>
          <input
            id="versement-date"
            name="dateEffective"
            type="date"
            value={dateEffective}
            onChange={(evenement) => setDateEffective(evenement.target.value)}
            aria-invalid={erreurDe("dateEffective") ? true : undefined}
            className={clsx(INPUT_BASE, "h-10")}
          />
          {erreurDe("dateEffective") && (
            <p className="text-xs text-red-400">{erreurDe("dateEffective")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="versement-mode" className="text-sm font-medium text-foreground">
            Mode de paiement<span className="ml-1 text-red-400">*</span>
          </label>
          <select
            id="versement-mode"
            name="modePaiement"
            value={modePaiement}
            onChange={(evenement) => setModePaiement(evenement.target.value)}
            className={clsx(INPUT_BASE, "h-10")}
          >
            {MODES_PAIEMENT.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="versement-commentaire"
            className="text-sm font-medium text-foreground"
          >
            Commentaire
          </label>
          <input
            id="versement-commentaire"
            name="commentaire"
            type="text"
            value={commentaire}
            onChange={(evenement) => setCommentaire(evenement.target.value)}
            maxLength={300}
            placeholder={
              cotisation?.type === "QUETE_CULTE"
                ? "Ex. Culte de louange du dimanche matin"
                : "Facultatif"
            }
            className={clsx(INPUT_BASE, "h-10")}
          />
        </div>
      </div>

      <div className="flex justify-end border-t border-card-border pt-4">
        <button
          type="submit"
          disabled={enCours || !soumissionPossible}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {enCours ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Check className="h-4 w-4" aria-hidden />
          )}
          {enCours ? "Enregistrement…" : "Enregistrer le versement"}
        </button>
      </div>
    </form>
  );
}
