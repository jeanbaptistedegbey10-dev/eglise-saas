"use client";

import { useMemo, useState } from "react";
import {
  Printer,
  X,
  Calendar,
  MapPin,
  User,
  Clock,
  FileText,
} from "lucide-react";
import type { CulteResume } from "@/types/culte";

type ProgrammePdfModalProps = {
  culte: CulteResume;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function formateHeure(heure: string | null): string {
  if (!heure) return "--:--";
  return heure;
}

/**
 * Garantit qu'aucun identifiant technique / CUID (ex: cmvfn3hwz...) ne s'affiche.
 * Retourne uniquement le nom complet propre, ou une chaîne vide si le nom
 * ressemble à un identifiant technique.
 */
function safeNom(nom: string | undefined): string {
  if (!nom) return "";
  // Un CUID fait typiquement 24+ caractères alphanumériques sans espace
  if (/^[a-z0-9]{24,}$/.test(nom.trim())) return "";
  return nom.trim();
}

function plageHoraireGlobale(culte: CulteResume): string {
  const debut = culte.heureDebut ? formateHeure(culte.heureDebut) : "";
  const fin = culte.heureFin ? formateHeure(culte.heureFin) : "";
  if (!debut && !fin) return "Horaires non définis";
  if (!fin) return `À partir de ${debut}`;
  if (!debut) return `Jusqu'à ${fin}`;
  return `${debut} - ${fin}`;
}

/**
 * Formate une date ISO (AAAA-MM-JJ) en jj/mm/aaaa sans dépendre du fuseau horaire.
 */
function formateDateFr(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Génère la liste des jours couverts par l'événement, de dateISO à dateFin inclus.
 * Retourne au minimum le jour de début lorsque seule dateISO est renseignée.
 */
function genererJours(culte: CulteResume): { dateISO: string; label: string }[] {
  const jours: { dateISO: string; label: string }[] = [];
  if (!culte.dateISO) return jours;
  const debut = new Date(culte.dateISO);
  const fin = culte.dateFin ? new Date(culte.dateFin) : debut;
  let cur = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate());
  const finDay = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
  while (cur <= finDay) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const dd = String(cur.getDate()).padStart(2, "0");
    const dateISO = `${y}-${m}-${dd}`;
    jours.push({
      dateISO,
      label: `Jour ${jours.length + 1} - ${formateDateFr(dateISO)}`,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return jours;
}

export default function ProgrammePdfModal({
  culte,
  onClose,
  onEdit,
  onDelete,
}: ProgrammePdfModalProps) {
  /** null = vue "Programme Global (Tous les jours)", sinon une date ISO "AAAA-MM-JJ". */
  const [dateSelectionnee, setDateSelectionnee] = useState<string | null>(null);

  const jours = genererJours(culte);
  const estPlurijournalier = jours.length > 1;

  const tachesTriees = [...(culte.taches ?? [])].sort((a, b) => {
    const ha = a.heureDebut ?? "";
    const hb = b.heureDebut ?? "";
    return ha.localeCompare(hb);
  });

  /** Tâches à afficher : toutes (global) ou uniquement celles du jour sélectionné. */
  const tachesAffiches = useMemo(() => {
    if (!dateSelectionnee) return tachesTriees;
    return tachesTriees.filter(
      (t) => (t.dateTache ?? culte.dateISO) === dateSelectionnee,
    );
  }, [tachesTriees, dateSelectionnee, culte.dateISO]);

  const responsablesEquipe = (
    tache: (typeof tachesTriees)[number],
  ): string => {
    const noms: string[] = [];
    if (tache.responsable) {
      const n = safeNom(tache.responsable.nomComplet);
      if (n && !noms.includes(n)) noms.push(n);
    }
    tache.equipe?.forEach((m) => {
      const n = safeNom(m.nomComplet);
      if (n && !noms.includes(n)) noms.push(n);
    });
    return noms.length > 0 ? noms.join(", ") : "Non assigné";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu du programme PDF"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-card-border bg-card p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-card-border no-print mb-6">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Printer className="h-5 w-5 text-primary" />
            <span>Aperçu du Programme / Fiche A4</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 no-print"
            >
              Imprimer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground no-print"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sélecteur de vue : Programme Global ou jour spécifique (non imprimé) */}
        <div className="no-print mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Vue :</span>
              <select
                value={dateSelectionnee ?? "GLOBAL"}
                onChange={(e) => {
                  const valeur = e.target.value;
                  setDateSelectionnee(valeur === "GLOBAL" ? null : valeur);
                }}
                className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="GLOBAL">
                  Programme Global (Tous les jours)
                </option>
                {jours.map((j) => (
                  <option key={j.dateISO} value={j.dateISO}>
                    {j.label}
                  </option>
                ))}
              </select>
              {estPlurijournalier && (
                <span className="text-xs text-muted-foreground">
                  ({jours.length} jours)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {dateSelectionnee
                ? `Filtre actif : ${jours.find((j) => j.dateISO === dateSelectionnee)?.label}`
                : `Toutes les tâches${estPlurijournalier ? ` sur ${jours.length} jours` : ""} de l'événement`}
            </p>
          </div>
        </div>

        <div className="space-y-6 print:space-y-4">
          <div className="text-center space-y-2 pb-6 border-b border-card-border print:border-none print:p-0 print:mb-0">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium print:hidden">
              <User className="h-3 w-3" /> Église SAAS — Programme Officiel
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-wide text-foreground print:text-2xl">
              {culte.intitule}
            </h1>
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-muted-foreground print:text-xs">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 shrink-0 print:h-3 print:w-3" />
                {culte.dateISO
                  ? new Date(culte.dateISO).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Date non définie"}
                {culte.dateFin && (
                  <>
                    {" au "}
                    {new Date(culte.dateFin).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0 print:h-3 print:w-3" />
                {plageHoraireGlobale(culte)}
              </span>
              {culte.lieu && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 print:h-3 print:w-3" />
                  {culte.lieu}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 shrink-0 print:h-3 print:w-3" />
                {safeNom(culte.responsable?.nomComplet) || "Responsable général non assigné"}
              </span>
            </div>
          </div>
          <div className="space-y-3 print:space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground print:text-base">
              <FileText className="h-5 w-5 text-primary print:h-4 print:w-4" />
              Déroulé et Tâches — Qui fait quoi à quel moment
            </h3>
            {tachesAffiches.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6 border border-dashed border-card-border rounded-lg print:border-none print:bg-transparent print:p-0">
                Aucune tâche enregistrée pour cet événement.
              </p>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-sm border-collapse print:text-xs">
                  <thead className="print:hidden">
                    <tr className="border-b border-card-border bg-accent/50 text-muted-foreground">
                      <th className="p-3 w-20">Horaire</th>
                      <th className="p-3">Activité</th>
                      <th className="p-3 w-32">Type</th>
                      <th className="p-3 w-48">Responsable & Équipe</th>
                      <th className="p-3">Détails / Consignes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {tachesAffiches.map((tache) => (
                      <tr
                        key={tache.id}
                        className="hover:bg-accent/20 print:hover:bg-transparent print:break-inside-avoid"
                      >
                        <td className="p-3 font-mono text-xs whitespace-nowrap font-medium text-foreground">
                          {formateHeure(tache.heureDebut)}
                          {tache.heureFin && ` - ${tache.heureFin}`}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          {tache.titre}
                        </td>
                        <td className="p-3">
                          {tache.typeTache ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                                tache.typeTache.couleur
                                  ? `bg-[${tache.typeTache.couleur}]/10 text-[${tache.typeTache.couleur}] border-[${tache.typeTache.couleur}]/30`
                                  : "bg-primary/10 text-primary border-primary/20"
                              }`}
                            >
                              {tache.typeTache.libelle}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-foreground">
                          <div className="font-medium">{responsablesEquipe(tache)}</div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {tache.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div
            className="mt-6 pt-4 border-t border-card-border flex items-center justify-between text-xs text-muted-foreground no-print"
          >
            <span>Généré par le module Cultes & Événements</span>
            <span>
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div className="flex gap-2">
              <button onClick={() => onEdit?.()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors">
                Modifier cet événement
              </button>
              <button onClick={() => onDelete?.()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 z-40 bg-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

