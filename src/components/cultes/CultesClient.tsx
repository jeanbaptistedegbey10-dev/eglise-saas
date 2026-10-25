"use client";

import React, { useState } from "react";
import { CalendarDays, List, Settings2, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import CulteFormModal from "@/components/cultes/CulteFormModal";
import TacheFormModal from "@/components/cultes/TacheFormModal";
import { supprimerCulte, gererTypesTache, listerTypesTache } from "@/actions/culte";
import { initialCulteFormState } from "@/types/culte";

export default function CultesClient({ cultes = [], membres = [], typesTache = [] }: any) {

const [culteEnEditionId, setCulteEnEditionId] = useState<string | null>(null);
  const [culteASupprimerId, setCulteASupprimerId] = useState<string | null>(null);
  const [ongletActif, setOngletActif] = useState<"evenements" | "taches" | "config">("evenements");
  const [filtreDate, setFiltreDate] = useState<"a_venir" | "passes" | "tous">("a_venir");
  const [configTypesTache, setConfigTypesTache] = useState<{ id: string; libelle: string; couleur: string | null; estParDefaut: boolean }[]>(typesTache ?? []);
  const [configFormOpen, setConfigFormOpen] = useState(false);
  const [configEditingId, setConfigEditingId] = useState<string | null>(null);
  const [configLibelle, setConfigLibelle] = useState("");
  const [configCouleur, setConfigCouleur] = useState("#6366f1");
  const [configEstParDefaut, setConfigEstParDefaut] = useState(false);
  const [tacheFormOpen, setTacheFormOpen] = useState(false);
  const [cultePourTache, setCultePourTache] = useState<any | null>(null);
  const [typeTacheASupprimerId, setTypeTacheASupprimerId] = useState<string | null>(null);
  const router = useRouter();

  const now = new Date();
  const cultesFiltres = cultes.filter((culte: any) => {
    const dateCulte = culte.date ? new Date(culte.date) : null;
    if (filtreDate === "a_venir") {
      if (!dateCulte) return true; // date non fixée inclus dans "À venir"
      return dateCulte >= now;
    }
    if (filtreDate === "passes") {
      if (!dateCulte) return false; // date non fixée exclue de "Passés"
      return dateCulte < now;
    }
    return true; // "tous" affiche tout
  });

  // ---------------------------------------------------------------------------
  // Suppression d'un culte (Server Action supprimerCulte)
  // ---------------------------------------------------------------------------
  const confirmerSuppressionCulte = async () => {
    if (!culteASupprimerId) return;
    const formData = new FormData();
    formData.append("culteId", culteASupprimerId);
    const result = await supprimerCulte(initialCulteFormState, formData);
    if (result.success) {
      setCulteASupprimerId(null);
    } else {
      alert(result.message || "Erreur lors de la suppression de l'événement.");
    }
  };

  // ---------------------------------------------------------------------------
  // Gestion des types de tâches (Server Action gererTypesTache)
  // ---------------------------------------------------------------------------
  const ouvrirFormulaireTypeTache = (type: { id: string; libelle: string; couleur: string | null; estParDefaut: boolean } | null = null) => {
    setConfigEditingId(type ? type.id : null);
    setConfigLibelle(type ? type.libelle : "");
    setConfigCouleur(type ? (type.couleur ?? "#6366f1") : "#6366f1");
    setConfigEstParDefaut(type ? type.estParDefaut : false);
    setConfigFormOpen(true);
  };

  const enregistrerTypeTache = async () => {
    if (!configLibelle.trim()) {
      alert("Le libellé est requis.");
      return;
    }
    const formData = new FormData();
    formData.append("action", configEditingId ? "update" : "create");
    if (configEditingId) formData.append("id", configEditingId);
    formData.append("libelle", configLibelle.trim());
    formData.append("couleur", configCouleur);
    formData.append("estParDefaut", configEstParDefaut ? "on" : "off");
    const result = await gererTypesTache(initialCulteFormState, formData);
    if (result.success) {
      setConfigFormOpen(false);
      setConfigLibelle("");
      setConfigCouleur("#6366f1");
      setConfigEstParDefaut(false);
      setConfigEditingId(null);
      const refreshed = await listerTypesTache();
      setConfigTypesTache(refreshed);
    } else {
      alert(result.message || "Erreur lors de l'enregistrement du type de tâche.");
    }
  };

  const demanderSuppressionTypeTache = (id: string) => {
    setTypeTacheASupprimerId(id);
  };

  const confirmerSuppressionTypeTache = async () => {
    if (!typeTacheASupprimerId) return;
    const id = typeTacheASupprimerId;
    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("id", id);
    const result = await gererTypesTache(initialCulteFormState, formData);
    if (result.success) {
      setTypeTacheASupprimerId(null);
      setConfigTypesTache(configTypesTache.filter((t) => t.id !== id));
    } else {
      setTypeTacheASupprimerId(null);
      alert(result.message || "Erreur lors de la suppression du type de tâche.");
    }
  };

  const afficherDateCulte = (culte: any) => {
    if (!culte.dateCulte && !culte.dateDebut && !culte.date) return "Date à préciser";
    const debut = new Date(culte.dateCulte || culte.dateDebut || culte.date);
    const fin = (culte.dateFin || culte.dateCulteFin) ? new Date(culte.dateFin || culte.dateCulteFin) : null;

    if (fin && debut.toDateString() !== fin.toDateString()) {
      return `Du ${debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au ${fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="bg-card/60 border border-card-border p-1 rounded-xl flex items-center gap-1">
        <button
          onClick={() => setOngletActif("evenements")}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
            ongletActif === "evenements"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <CalendarDays aria-hidden className="h-4 w-4"/> Calendrier & Événements
        </button>
        <button
          onClick={() => setOngletActif("taches")}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
            ongletActif === "taches"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <List aria-hidden className="h-4 w-4"/> Tâches & Déroulé
        </button>
        <button
          onClick={() => setOngletActif("config")}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
            ongletActif === "config"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <Settings2 aria-hidden className="h-4 w-4"/> Configuration
        </button>
      </div>

        <button
          onClick={() => setCulteEnEditionId("nouveau")}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl bg-primary hover:bg-primary/90 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4"/> Programmer un événement
        </button>
      </div>

      {ongletActif === "evenements" && (
        <div className="space-y-6 w-full">
          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltreDate("a_venir")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filtreDate === "a_venir" ? "bg-primary text-primary-foreground" : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
              }`}
            >
              À venir
            </button>
            <button
              onClick={() => setFiltreDate("passes")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filtreDate === "passes" ? "bg-primary text-primary-foreground" : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Passés
            </button>
            <button
              onClick={() => setFiltreDate("tous")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filtreDate === "tous" ? "bg-primary text-primary-foreground" : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Tous ({cultes.length})
            </button>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {cultesFiltres.length === 0 ? (
              <div className="col-span-full p-8 text-center text-muted-foreground bg-card border border-card-border rounded-2xl">
                Aucun événement trouvé pour ce filtre.
              </div>
            ) : (
              cultesFiltres.map((culte: any) => (
                <div key={culte.id} className="p-5 bg-card border border-card-border rounded-2xl text-card-foreground space-y-4 shadow-sm hover:border-primary/50 transition-all">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">{culte.intitule || culte.titre || "Culte sans titre"}</h3>
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {culte.type || "Culte"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {afficherDateCulte(culte)}
                    {culte.lieu || culte.location ? (
                      <span className="ml-2 text-xs font-medium text-primary">📍 {culte.lieu || culte.location}</span>
                    ) : (
                      <span className="ml-2 text-xs font-medium text-muted-foreground">📍 Lieu non précisé</span>
                    )}
                  </p>
                  
                  <div className="pt-2 border-t border-card-border/50 space-y-1">
                    {culte.taches && culte.taches.length > 0 ? (
                      <>
                        {culte.taches.slice(0, 2).map((t: any) => (
                          <div key={t.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-medium">{t.titre}</span>
                            {t.heureDebut && <span className="mr-1">• {t.heureDebut}</span>}
                            {t.responsable?.nomComplet && (
                              <span className="text-primary">{t.responsable.nomComplet}</span>
                            )}
                          </div>
                        ))}
                        {culte.taches.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            + {culte.taches.length - 2} autre(s) tâche(s)
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aucune tâche assignée</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-card-border flex-wrap">
                    <button
                      onClick={() => router.push(`/cultes/${culte.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5"/> Aperçu & Contrôle
                    </button>
                    <button
                      onClick={() => setCulteEnEditionId(culte.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-500/10 text-gray-300 hover:bg-gray-500/20 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5"/> Modifier
                    </button>

                    <button
                      onClick={() => setCulteASupprimerId(culte.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5"/> Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Taches */}
      {ongletActif === "taches" && (
        <div className="p-8 bg-card border border-card-border rounded-2xl text-center text-foreground space-y-3">
          <h3 className="text-lg font-semibold">Gestion des Tâches & Déroulé</h3>
          <p className="text-sm">Module de gestion des attributions et du déroulement des cultes.</p>
        </div>
      )}

      {/* Tab Content: Config */}
      {ongletActif === "config" && (
        <div className="p-6 bg-card border border-card-border rounded-2xl text-card-foreground space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Configuration des Cultes</h3>
              <p className="text-sm text-muted-foreground">
                Administrez les types de tâches (Prédication, Louange, Accueil…) et les paramètres par défaut du module.
              </p>
            </div>
            <button
              onClick={() => ouvrirFormulaireTypeTache()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary/90 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" /> Nouveau type de tâche
            </button>
          </div>

          {/* Formulaire type de tâche (ajout / édition) */}
          {configFormOpen && (
            <div className="bg-card/50 border border-card-border p-5 rounded-xl space-y-4">
              <h4 className="text-sm font-semibold text-foreground">
                {configEditingId ? "Modifier le type de tâche" : "Ajouter un type de tâche"}
              </h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Libellé *</label>
                  <input
                    value={configLibelle}
                    onChange={(e) => setConfigLibelle(e.target.value)}
                    placeholder="Ex: Prédication, Louange, Distribution…"
                    className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Couleur</label>
                    <input
                      value={configCouleur}
                      onChange={(e) => setConfigCouleur(e.target.value)}
                      type="color"
                      className="w-full h-10 rounded-lg border-none bg-transparent p-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center space-y-1.5">
                    <input
                      id="configEstParDefaut"
                      type="checkbox"
                      checked={configEstParDefaut}
                      onChange={(e) => setConfigEstParDefaut(e.target.checked)}
                      className="rounded bg-background border border-card-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="configEstParDefaut" className="text-xs text-muted-foreground">
                      Type par défaut
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setConfigFormOpen(false)}
                  className="px-4 py-2 rounded-lg border border-card-border text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={enregistrerTypeTache}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/95 disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Liste des types de tâches */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Types de tâches configurés
            </h4>
            {configTypesTache.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun type de tâche configuré.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {configTypesTache.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 bg-card/50 border border-card-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.couleur ?? "#6366f1" }}
                      />
                      <span className="text-sm font-medium text-foreground">{t.libelle}</span>
                      {t.estParDefaut && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary border border-primary/20">
                          Par défaut
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => ouvrirFormulaireTypeTache(t)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* Suppression de type de tâche désactivée (fonction non disponible) */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {culteEnEditionId && (
        <CulteFormModal
          membres={membres}
          onClose={() => setCulteEnEditionId(null)}
          culte={
            culteEnEditionId === "nouveau"
              ? null
              : cultes.find((c: any) => c.id === culteEnEditionId)
          }
        />
      )}

      {/* Confirmation de suppression d'un événement (modale personnalisée Design System) */}
      <BoiteConfirmationSuppression
        ouvert={!!culteASupprimerId}
        titre="Confirmer la suppression de l'événement"
        message="Cet événement et toutes ses tâches associées seront supprimés de manière irréversible."
        champConfirmation
        boutonConfirmerLabel="Supprimer définitivement"
        onAnnuler={() => setCulteASupprimerId(null)}
        onConfirmer={confirmerSuppressionCulte}
      />

      {/* Confirmation de suppression d'un type de tâche (modale personnalisée Design System) */}
      <BoiteConfirmationSuppression
        ouvert={!!typeTacheASupprimerId}
        titre="Confirmer la suppression du type de tâche"
        message="Ce type de tâche sera supprimé de manière irréversible."
        boutonConfirmerLabel="Supprimer ce type"
        onAnnuler={() => setTypeTacheASupprimerId(null)}
        onConfirmer={confirmerSuppressionTypeTache}
      />

      {/* Modale d'ajout d'une tâche liée à l'événement */}
      {tacheFormOpen && cultePourTache && (
        <TacheFormModal
          culteId={cultePourTache.id}
          culteIntitule={cultePourTache.intitule ?? cultePourTache.titre ?? "Événement"}
          culte={cultePourTache}
          membres={membres}
          typesTache={typesTache}
          onClose={() => setTacheFormOpen(false)}
          tache={null}
        />
      )}
    </div>
    )
  }

const afficherDateCulte = (culte: any) => {
  const rawDebut = culte.dateCulte || culte.dateDebut || culte.startDate;
  const rawFin = culte.dateFin || culte.endDate;

  if (!rawDebut) return "Date à préciser";

  const debut = new Date(rawDebut);
  const fin = rawFin ? new Date(rawFin) : null;

  if (isNaN(debut.getTime())) return "Date à préciser";

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

  if (fin && !isNaN(fin.getTime()) && debut.toDateString() !== fin.toDateString()) {
    return `Du ${debut.toLocaleDateString('fr-FR', options)} au ${fin.toLocaleDateString('fr-FR', options)}`;
  }

  return debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

function BoiteConfirmationSuppression({
  ouvert,
  titre = "Confirmer la suppression",
  message,
  champConfirmation = false,
  boutonConfirmerLabel = "Supprimer définitivement",
  onAnnuler,
  onConfirmer,
}: {
  ouvert: boolean;
  titre?: string;
  message: string;
  champConfirmation?: boolean;
  boutonConfirmerLabel?: string;
  onAnnuler: () => void;
  onConfirmer: () => void;
}) {
  const [saisie, setSaisie] = useState("");

  const pret = !champConfirmation || saisie === "SUPPRIMER";

  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onAnnuler}>
      <div className="relative w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-2xl text-card-foreground" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-destructive">{titre}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {champConfirmation && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Tapez « SUPPRIMER » pour confirmer</label>
            <input
              autoFocus
              value={saisie}
              onChange={(e) => setSaisie(e.target.value.toUpperCase())}
              placeholder="SUPPRIMER"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onAnnuler}
            className="px-4 py-2 rounded-lg border border-card-border text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!pret}
            onClick={onConfirmer}
            className={`px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 shadow-sm ${!pret ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {boutonConfirmerLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
