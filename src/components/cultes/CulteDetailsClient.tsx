"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Eye,
  Pencil,
  Trash2,
  Printer,
  Plus,
} from "lucide-react";
import { supprimerCulte } from "@/actions/culte";
import { supprimerTacheEvenement } from "@/actions/taches";
import TacheFormModal from "@/components/cultes/TacheFormModal";
import CulteFormModal from "@/components/cultes/CulteFormModal";
import { initialCulteFormState } from "@/types/culte";
import type {
  CulteResume,
  TacheResume,
  MembreOption,
  TypeTacheResume,
} from "@/types/culte";

type CulteDetailsClientProps = {
  culte: CulteResume;
  membres: MembreOption[];
  typesTache: TypeTacheResume[];
  configurationEglise?: {
    nomOfficiel?: string;
    logoUrl?: string | null;
    telephones?: string[];
    adresseSiege?: string;
    ville?: string;
    emailContact?: string;
    mission?: string;
    numeroEnregistrement?: string;
    ifu?: string;
    rib?: string;
  };
};

function formateDateFr(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formateDateCourte(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formateHeure(heure: string | null): string {
  if (!heure) return "--:--";
  return heure;
}

function libelleJour(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const libelle = new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return libelle.charAt(0).toUpperCase() + libelle.slice(1);
}

/**
 * Construit la ligne de contact institutionnelle à afficher sur les documents officiels :
 * numéros de téléphone séparés par « • », puis l'e-mail le cas échéant.
 */
function ligneContactEglise(config: CulteDetailsClientProps["configurationEglise"]): string {
  const parties: string[] = [];
  if (config?.telephones && config.telephones.length > 0) {
    parties.push(config.telephones.join(" • "));
  }
  if (config?.emailContact) {
    parties.push(config.emailContact);
  }
  return parties.join(" • ");
}

function LigneTache({
  tache,
  onModifier,
  onSupprimer,
}: {
  tache: TacheResume;
  onModifier: (tache: TacheResume) => void;
  onSupprimer: (tacheId: string) => void;
}) {
  return (
    <tr key={tache.id} className="border-b border-card-border/50 hover:bg-accent/5 print:break-inside-avoid">
      <td className="p-3 font-mono text-xs font-medium text-foreground">
        {formateHeure(tache.heureDebut)}
        {tache.heureFin && ` - ${formateHeure(tache.heureFin)}`}
      </td>
      <td className="p-3 text-xs font-medium text-foreground">{tache.titre}</td>
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
        {tache.responsable?.nomComplet || <span className="text-muted-foreground">—</span>}
      </td>
      <td className="p-3">
        {tache.equipe.length > 0 ? (
          tache.equipe.map((m) => (
            <span
              key={m.id}
              className="mx-0.5 inline-block px-2 py-0.5 rounded border border-card-border text-[10px] font-medium text-muted-foreground bg-muted/50"
            >
              {m.nomComplet}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {tache.description || "—"}
      </td>
      <td className="p-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onModifier(tache)}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            title="Modifier la tâche"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSupprimer(tache.id)}
            className="p-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            title="Supprimer la tâche"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function LigneTacheOfficiel({ tache, typeImpression }: { tache: TacheResume; typeImpression: "detaille" | "resume" }) {
  return (
    <tr className="print:border-b print:border-black/30 print:break-inside-avoid">
      <td className="print:px-3 print:py-2 print:text-xs print:text-black print:font-mono">
        {formateHeure(tache.heureDebut)}{tache.heureFin && ` - ${formateHeure(tache.heureFin)}`}
      </td>
      <td className="print:px-3 print:py-2 print:text-xs print:text-black print:font-medium">
        {tache.titre}
      </td>
      <td className={`print:px-3 print:py-2 print:text-xs print:text-black ${typeImpression === "resume" ? "hidden" : ""}`}>
        {tache.typeTache?.libelle || "—"}
      </td>
      <td className={`print:px-3 print:py-2 print:text-xs print:text-black ${typeImpression === "resume" ? "hidden" : ""}`}>
        {tache.responsable?.nomComplet || "—"}
      </td>
      <td className={`print:px-3 print:py-2 print:text-xs print:text-black ${typeImpression === "resume" ? "hidden" : ""}`}>
        {tache.equipe.length > 0 ? tache.equipe.map((m) => m.nomComplet).join(", ") : "—"}
      </td>
      <td className={`print:px-3 print:py-2 print:text-xs print:text-black ${typeImpression === "resume" ? "hidden" : ""}`}>
        {tache.description || "—"}
      </td>
    </tr>
  );
}

function TableauDeroulementOfficiel({ taches, typeImpression }: { taches: TacheResume[]; typeImpression: "detaille" | "resume" }) {
  if (taches.length === 0) {
    return (
      <tr>
        <td colSpan={typeImpression === "resume" ? 2 : 6} className="print:px-3 print:py-6 print:text-center print:text-xs print:text-black/60 print:italic">
          Aucune tâche planifiée.
        </td>
      </tr>
    );
  }
  return (
    <>
      <thead>
        <tr className="print:bg-black/10 print:border-b print:border-black">
          <th className="print:px-3 print:py-2 print:text-left print:text-xs print:font-bold print:text-black print:border-b print:border-black">
            Heure
          </th>
          <th className="print:px-3 print:py-2 print:text-left print:text-xs print:font-bold print:text-black print:border-b print:border-black">
            Activité / Titre
          </th>
          <th className={`print:px-3 print:py-2 print:text-left print:text-xs print:font-bold print:text-black print:border-b print:border-black ${typeImpression === "resume" ? "hidden" : ""}`}>
            Type
          </th>
          <th className={`print:px-3 print:py-2 print:text-left print:text-xs print:font-bold print:text-black print:border-b print:border-black ${typeImpression === "resume" ? "hidden" : ""}`}>
            Responsable Principal
          </th>
          <th className={`print:px-3 print:py-2 print:text-left print:text-xs print:font-bold print:text-black print:border-b print:border-black ${typeImpression === "resume" ? "hidden" : ""}`}>
            Équipe
          </th>
          <th className={`print:px-3 print:py-2 print:text-left print:text-xs print:font-bold print:text-black print:border-b print:border-black ${typeImpression === "resume" ? "hidden" : ""}`}>
            Consignes &amp; Description
          </th>
        </tr>
      </thead>
      <tbody>
        {taches.map((tache) => (
          <LigneTacheOfficiel key={tache.id} tache={tache} typeImpression={typeImpression} />
        ))}
      </tbody>
    </>
  );
}

export default function CulteDetailsClient({ culte, membres, typesTache, configurationEglise }: CulteDetailsClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const [tacheFormOpen, setTacheFormOpen] = useState(false);
  const [culteASupprimerId, setCulteASupprimerId] = useState<string | null>(null);
  const [vueActif, setVueActif] = useState<"global" | "jour">("global");
  const [dateSelectionnee, setDateSelectionnee] = useState<string | null>(null);
  const [tacheAEditer, setTacheAEditer] = useState<TacheResume | null>(null);
  const [tacheASupprimerId, setTacheASupprimerId] = useState<string | null>(null);
  const [typeImpression, setTypeImpression] = useState<"detaille" | "resume">("detaille");
  const dateDebut = culte.dateISO;
  const dateFin = culte.dateFin ?? dateDebut;

  const joursCouverts = useMemo(() => {
    const jours: string[] = [];
    if (!dateDebut) return jours;
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    let cur = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate());
    const finDay = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
    while (cur <= finDay) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const dd = String(cur.getDate()).padStart(2, "0");
      jours.push(`${y}-${m}-${dd}`);
      cur.setDate(cur.getDate() + 1);
    }
    return jours;
  }, [dateDebut, dateFin]);

  const tachesParJour = useMemo(() => {
    const map = new Map<string, TacheResume[]>();
    (culte.taches ?? []).forEach((t) => {
      const cle = t.dateTache ?? dateDebut;
      if (!map.has(cle)) map.set(cle, []);
      map.get(cle)!.push(t);
    });
    map.forEach((ts) =>
      ts.sort((a, b) => (a.heureDebut ?? "").localeCompare(b.heureDebut ?? ""))
    );
    return map;
  }, [culte.taches, dateDebut]);

  const joursAvecTaches = useMemo(() => [...tachesParJour.keys()].sort(), [tachesParJour]);

  const tachesDuJour = useMemo(
    () => (dateSelectionnee ? [...(tachesParJour.get(dateSelectionnee) ?? [])] : []),
    [tachesParJour, dateSelectionnee]
  );

  const confirmerSuppressionCulte = async () => {
    if (!culteASupprimerId) return;
    const formData = new FormData();
    formData.append("culteId", culteASupprimerId);
    const result = await supprimerCulte(initialCulteFormState, formData);
    if (result.success) {
      setCulteASupprimerId(null);
      router.push("/cultes");
      router.refresh();
    } else {
      alert(result.message || "Erreur lors de la suppression de l'événement.");
    }
  };

  const handleSupprimerTache = async () => {
    if (!tacheASupprimerId) return;
    const formData = new FormData();
    formData.append("tacheId", tacheASupprimerId);
    const result = await supprimerTacheEvenement(initialCulteFormState, formData);
    if (result.success) {
      setTacheASupprimerId(null);
      router.refresh();
    } else {
      alert(result.message || "Erreur lors de la suppression de la tâche.");
    }
  };

  const minDateISO = dateDebut;
  const maxDateISO = dateFin;

  return (
    <div className="space-y-6 print:bg-white print:text-black print:p-0 print:shadow-none">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #document-impression-officiel, #document-impression-officiel * {
            visibility: visible !important;
          }
          #document-impression-officiel {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
      {/* En-tête de l'événement */}
      <div className="bg-card border border-card-border rounded-2xl p-6 text-card-foreground shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1">{culte.intitule}</h1>
            <p className="text-sm text-muted-foreground">
              {culte.type === "RESPONSABILISE" ? "Responsabilisé" : "Optionnel"} •
              {culte.statut === "PLANIFIE" ? "Planifié" : culte.statut === "TERMINE" ? "Terminé" : "Annulé"}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground mb-1">Date de début</div>
            <div className="text-sm font-medium">{formateDateFr(dateDebut)}</div>
            {dateFin && dateFin !== dateDebut && (
              <div>
                <div className="text-xs text-muted-foreground mt-1">Date de fin</div>
                <div className="text-sm font-medium">{formateDateFr(dateFin)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Lieu</div>
            <div className="text-sm font-medium">{culte.lieu || "Non précisé"}</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Responsable</div>
            <div className="text-sm font-medium">{culte.responsable?.nomComplet || "Non assigné"}</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Heures</div>
            <div className="text-sm font-medium">
              {formateHeure(culte.heureDebut)} - {formateHeure(culte.heureFin)}
            </div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tâches</div>
            <div className="text-sm font-medium">{culte.taches?.length ?? 0}</div>
          </div>
        </div>

        {culte.description && (
          <div className="mb-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Description</div>
            <p className="text-sm text-foreground break-all overflow-wrap-anywhere whitespace-pre-wrap" style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{culte.description}</p>
          </div>
        )}

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-primary/70 uppercase tracking-wider mb-1">Période de l'événement</div>
              <div className="text-sm font-medium text-foreground">
                {dateFin !== dateDebut
                  ? `Du ${formateDateCourte(dateDebut)} au ${formateDateCourte(dateFin)}`
                  : formateDateFr(dateDebut)}
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Sélecteur du mode d'impression (écran uniquement) */}
      <div className="flex items-center gap-3 mb-4 print:hidden">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Mode d'impression :</span>
        <button
          onClick={() => setTypeImpression("detaille")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            typeImpression === "detaille"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Programme Détaillé
        </button>
        <button
          onClick={() => setTypeImpression("resume")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            typeImpression === "resume"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Programme Résumé
        </button>
      </div>

      {/* Boutons d'action principaux */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" /> Modifier cet événement
        </button>
        <button
          onClick={() => setCulteASupprimerId(culte.id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Supprimer
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-card border border-card-border hover:bg-accent/50 transition-colors"
        >
          <Printer className="h-3.5 w-3.5" /> Imprimer
        </button>
      </div>

      {/* Sélecteur de vue */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Programme des tâches
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => { setVueActif("global"); setDateSelectionnee(null); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                vueActif === "global"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Programme Global (Tous les jours)
            </button>
            <button
              onClick={() => setVueActif("jour")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                vueActif === "jour"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Vue par jour
            </button>
          </div>
        </div>

        {vueActif === "jour" && joursCouverts.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {joursCouverts.map((jourISO) => {
              const estSelectionne = dateSelectionnee === jourISO;
              return (
                <button
                  key={jourISO}
                  onClick={() => setDateSelectionnee(jourISO)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    estSelectionne
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card border border-card-border text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  {formateDateCourte(jourISO)}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-card-border">
                <th className="p-3 text-xs font-medium text-muted-foreground">Heure</th>
                <th className="p-3 text-xs font-medium text-muted-foreground">Titre</th>
                <th className="p-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="p-3 text-xs font-medium text-muted-foreground">Responsable</th>
                <th className="p-3 text-xs font-medium text-muted-foreground">Équipe</th>
                <th className="p-3 text-xs font-medium text-muted-foreground">Description</th>
                <th className="p-3 text-xs font-medium text-muted-foreground text-right print:hidden">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {vueActif === "jour" ? (
                dateSelectionnee ? (
                  <>
                    <tr
                      key={`en-tete-jour-${dateSelectionnee}`}
                      className="bg-muted/50 border-b border-card-border print:break-inside-avoid"
                    >
                      <td colSpan={7} className="p-3 text-xs font-semibold text-foreground uppercase tracking-wider">
                        📅 {libelleJour(dateSelectionnee)}
                      </td>
                    </tr>
                    {tachesDuJour.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground italic">
                          Aucune tâche planifiée pour le {formateDateCourte(dateSelectionnee)}.
                        </td>
                      </tr>
                    ) : (
                      tachesDuJour.map((tache) => (
                        <LigneTache
                          key={tache.id}
                          tache={tache}
                          onModifier={(t) => {
                            setTacheAEditer(t);
                            setTacheFormOpen(true);
                          }}
                          onSupprimer={setTacheASupprimerId}
                        />
                      ))
                    )}
                  </>
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground italic">
                      Sélectionnez un jour pour afficher ses tâches.
                    </td>
                  </tr>
                )
              ) : (
                joursAvecTaches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground italic">
                      Aucune tâche définie pour cet événement.
                    </td>
                  </tr>
                ) : (
                  joursAvecTaches.map((dateISO) => [
                    <tr
                      key={`en-tete-jour-${dateISO}`}
                      className="bg-muted/50 border-b border-card-border print:break-inside-avoid"
                    >
                      <td colSpan={7} className="p-3 text-xs font-semibold text-foreground uppercase tracking-wider">
                        📅 {libelleJour(dateISO)}
                      </td>
                    </tr>,
                    ...tachesParJour.get(dateISO)!.map((tache) => (
                      <LigneTache
                        key={tache.id}
                        tache={tache}
                        onModifier={(t) => {
                          setTacheAEditer(t);
                          setTacheFormOpen(true);
                        }}
                        onSupprimer={setTacheASupprimerId}
                      />
                    )),
                  ])
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bouton + Tâche */}
      <div className="flex items-center justify-end gap-2 print:hidden">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-card-border text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          title="Imprimer le programme"
        >
          <span role="img" aria-label="Imprimer">
            🖨️
          </span>{" "}
          Imprimer
        </button>
        <button
          onClick={() => {
            setTacheAEditer(null);
            setTacheFormOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> + Tâche
        </button>
      </div>

      {/* Modale de création de tâche */}
      {tacheFormOpen && (
        <TacheFormModal
          culteId={culte.id}
          culteIntitule={culte.intitule}
          culte={{
            ...culte,
            dateCulte: culte.dateISO,
            dateDebut: culte.dateISO,
            dateFin: culte.dateFin,
            startDate: culte.dateISO,
            endDate: culte.dateFin,
          }}
          membres={membres}
          typesTache={typesTache}
          onClose={() => setTacheFormOpen(false)}
          tache={tacheAEditer}
        />
      )}

      {/* Modale d'édition du culte */}
      {isEditing && (
        <CulteFormModal
          culte={culte}
          membres={membres}
          onClose={() => setIsEditing(false)}
        />
      )}

      {/* Confirmation de suppression */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm ${
          !culteASupprimerId ? "hidden" : ""
        }`}
        onClick={() => setCulteASupprimerId(null)}
      >
        <div
          className="relative w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-2xl text-card-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-destructive">Confirmer la suppression</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cet événement et toutes ses tâches associées seront supprimés de manière irréversible.
          </p>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setCulteASupprimerId(null)}
              className="px-4 py-2 rounded-lg border border-card-border text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmerSuppressionCulte}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 shadow-sm"
            >
              Supprimer définitivement
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation de suppression d'une tâche */}
      {tacheASupprimerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Confirmer la suppression</h3>
            <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTacheASupprimerId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleSupprimerTache()}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document officiel d'impression A4 — masqué à l'écran, affiché uniquement à l'impression */}
      <div
        id="document-impression-officiel"
        className="hidden print:block print:w-full print:min-h-[297mm] print:bg-white print:text-black print:p-6 print:overflow-visible print:break-after-avoid"
      >
        {/* ===== EN-TÊTE INSTITUTIONNEL D'ÉGLISE (RÉPÉTITIF SUR CHAQUE PAGE) ===== */}
        <header className="print:mb-2 print:border-b print:border-black print:pb-1 print:py-2 print:flex print:flex-col print:items-center print:text-center print:gap-1">
          {/* Logo officiel centré en haut */}
          <div className="print:mb-1">
            {configurationEglise?.logoUrl ? (
              <img
                src={configurationEglise.logoUrl}
                alt="Logo officiel de l'église"
                className="print:h-10 print:w-auto print:object-contain print:max-w-24 mx-auto"
              />
            ) : (
              <div className="print:h-10 print:w-10 print:rounded print:border print:border-black print:flex print:items-center print:justify-center print:text-[10px] print:font-bold print:text-black/40 print:mx-auto">
                {(configurationEglise?.nomOfficiel || "ÉGLISE").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Nom officiel de l'église */}
          <h1 className="print:text-base print:font-bold print:text-black print:uppercase print:tracking-tighter print:leading-tight print:m-0 print:text-center print:mb-1">
            {(configurationEglise?.nomOfficiel || "ÉGLISE").toUpperCase()}
          </h1>

          {/* Mission de l'église */}
          {(configurationEglise?.mission) && (
            <p className="print:text-xs print:text-gray-700 print:italic print:m-0 print:text-center print:max-w-lg print:mx-auto print:mb-1">
              {configurationEglise.mission}
            </p>
          )}

          {/* Adresse et téléphones sur une seule ligne fine */}
          <div className="print:text-[10px] print:text-black/80 print:m-0 print:leading-tight print:text-center print:mb-0">
            {(configurationEglise?.adresseSiege || configurationEglise?.ville) && (
              <>
                {configurationEglise?.adresseSiege || ""}
                {configurationEglise?.ville ? `, ${configurationEglise.ville}` : ""}
                {ligneContactEglise(configurationEglise) ? " • " : ""}
              </>
            )}
            {ligneContactEglise(configurationEglise)}
          </div>

          <hr className="print:border-t print:border-black print:my-1 print:w-full" />
        </header>

        {/* ===== BLOC ÉVÉNEMENT & THÈME ===== */}
        <section className="print:mb-6">
          <h2 className="print:text-2xl print:font-bold print:text-black print:mb-4 print:tracking-tight">
            {culte.intitule}
          </h2>

          {culte.theme && (
            <div className="print:bg-black/10 print:border print:border-black/30 print:rounded-xl print:p-4 print:mb-6">
              <div className="print:flex print:items-start print:gap-3">
                <span
                  className="print:text-xs print:font-bold print:text-primary/70 print:uppercase print:tracking-wider print:shrink-0 print:mt-0.5"
                >
                  Thème
                </span>
                <div>
                  <p className="print:text-xl print:font-bold print:text-black print:mb-1 print:break-all print:overflow-wrap-anywhere print:whitespace-pre-wrap" style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>
                    {culte.theme}
                  </p>
                  {culte.descriptionTheme && (
                    <p className="print:text-sm print:text-black/80 print:whitespace-pre-wrap print:break-all print:overflow-wrap-anywhere print:break-words" style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>
                      {culte.descriptionTheme}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grille d'informations : Période, Lieu, Heures, Responsable Général */}
          <div
            className="print:grid print:grid-cols-2 print:gap-4 print:mb-6"
          >
            <div className="print:border print:border-black/30 print:p-3 print:rounded">
              <span
                className="print:block print:text-xs print:font-bold print:text-black/60 print:uppercase print:tracking-wider print:mb-1"
              >
                Période
              </span>
              <div className="print:text-sm print:text-black">
                {dateFin !== dateDebut
                  ? `Du ${formateDateCourte(dateDebut)} au ${formateDateCourte(dateFin)}`
                  : formateDateFr(dateDebut)}
              </div>
            </div>
            <div className="print:border print:border-black/30 print:p-3 print:rounded">
              <span
                className="print:block print:text-xs print:font-bold print:text-black/60 print:uppercase print:tracking-wider print:mb-1"
              >
                Lieu
              </span>
              <div className="print:text-sm print:text-black">
                {culte.lieu || "Non précisé"}
              </div>
            </div>
            <div className="print:border print:border-black/30 print:p-3 print:rounded">
              <span
                className="print:block print:text-xs print:font-bold print:text-black/60 print:uppercase print:tracking-wider print:mb-1"
              >
                Heures
              </span>
              <div className="print:text-sm print:text-black">
                {formateHeure(culte.heureDebut)} — {formateHeure(culte.heureFin)}
              </div>
            </div>
            <div className="print:border print:border-black/30 print:p-3 print:rounded">
              <span
                className="print:block print:text-xs print:font-bold print:text-black/60 print:uppercase print:tracking-wider print:mb-1"
              >
                Responsable Général
              </span>
              <div className="print:text-sm print:text-black">
                {culte.responsable?.nomComplet || "Non assigné"}
              </div>
            </div>
          </div>
        </section>

        {/* ===== TABLEAU DU DÉROULÉ ===== */}
        <>
            <h2
              className="print:text-lg print:font-bold print:text-black print:mb-3 print:border-b print:border-black print:pb-1"
            >
              Programme Détaillé
            </h2>

            {vueActif === "jour" ? (
              dateSelectionnee ? (
                <section className="print:mb-6 print:break-inside-avoid">
                  <h3
                    className="print:text-base print:font-bold print:text-black print:mb-2 print:border-b print:border-black/30 print:pb-1"
                  >
                    📅 {libelleJour(dateSelectionnee)}
                  </h3>
                  <table className="print:w-full print:border-collapse print:border print:border-black print:mb-8">
                    <TableauDeroulementOfficiel taches={tachesDuJour} typeImpression={typeImpression} />
                  </table>
                </section>
              ) : (
                <div className="print:text-sm print:text-black/60 print:italic print:mb-6">
                  Sélectionnez un jour pour imprimer son programme détaillé.
                </div>
              )
            ) : (
              joursAvecTaches.length === 0 ? (
                <div className="print:text-sm print:text-black/60 print:italic">
                  Aucune tâche définie pour cet événement.
                </div>
              ) : (
                joursAvecTaches.map((dateISO) => (
                  <section key={dateISO} className="print:mb-6 print:break-inside-avoid">
                    <h3
                      className="print:text-base print:font-bold print:text-black print:mb-2 print:border-b print:border-black/30 print:pb-1"
                    >
                      📅 {libelleJour(dateISO)}
                    </h3>
                    <table className="print:w-full print:border-collapse print:border print:border-black print:mb-8">
                      <TableauDeroulementOfficiel
                        taches={tachesParJour.get(dateISO) ?? []}
                        typeImpression={typeImpression}
                      />
                    </table>
                  </section>
                ))
              )
            )}
          </>

        {/* ===== ZONE DE SIGNATURE PASTORALE (FIN DU DOCUMENT) ===== */}
        <div className="print:break-inside-avoid print:mt-8 print:w-full print:flex print:flex-col md:print:flex-row print:justify-between print:items-baseline print:text-xs print:text-black">
          <div>
            <div className="print:font-bold print:text-black print:mb-1">
              Fiche Officielle — Générée le{" "}
              {new Date().toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
          <div className="print:text-right print:mt-2 md:print:mt-0">
            <div className="print:font-bold print:text-black print:mb-1">
              Direction pastorale
            </div>
            <div className="print:h-6 print:w-48 print:border-b print:border-black print:mt-2 print:text-black/60"></div>
            <div className="print:text-xs print:text-black/60 print:mt-1 print:italic">
              Signature / Validation
            </div>
          </div>
        </div>

        {/* ===== PIED DE PAGE INSTITUTIONNEL (RÉPÉTITIF SUR CHAQUE PAGE) ===== */}
        <footer className="print:fixed print:bottom-[6mm] print:left-0 print:right-0 print:w-full print:bg-white print:z-50 print:pt-2 print:border-t print:border-black print:flex print:flex-col print:items-center print:text-[10px] print:text-black print:gap-1 print:text-center">
          {/* Nom officiel + Adresse + Téléphones & E-mail sur une ligne compacte */}
          <div className="print:text-[10px] print:text-black/80 print:m-0 print:leading-tight print:w-full print:text-center print:mb-1">
            {(configurationEglise?.nomOfficiel || "ÉGLISE")}
            {configurationEglise?.adresseSiege || configurationEglise?.ville ? " • " : ""}
            {configurationEglise?.adresseSiege || ""}
            {configurationEglise?.ville ? `, ${configurationEglise.ville}` : ""}
            {ligneContactEglise(configurationEglise) ? " • " : ""}
            {ligneContactEglise(configurationEglise)}
          </div>

          {/* Ligne des numéros légaux et administratifs */}
          <div className="print:text-[10px] print:text-gray-600 print:m-0 print:leading-tight print:w-full print:text-center print:mb-0">
            {configurationEglise?.numeroEnregistrement ? `Décret : ${configurationEglise.numeroEnregistrement}` : ""}
            {configurationEglise?.ifu ? ` | IFU : ${configurationEglise.ifu}` : ""}
            {configurationEglise?.rib ? ` | RIB : ${configurationEglise.rib}` : ""}
          </div>
        </footer>
      </div>
    </div>
  );
}

