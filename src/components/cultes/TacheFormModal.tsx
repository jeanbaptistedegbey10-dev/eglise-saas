"use client";

import { useState } from "react";
import { X, Search } from "lucide-react";
import { enregistrerTache } from "@/actions/culte";
import { initialCulteFormState } from "@/types/culte";
import type { MembreOption, TacheResume, TypeTacheResume } from "@/types/culte";

type TypeTacheOption = { id: string; libelle: string; couleur?: string | null; };

type TacheFormModalProps = {
  culteId: string;
  culteIntitule: string;
  culte?: any;
  membres?: MembreOption[];
  typesTache?: TypeTacheOption[];
  onClose?: () => void;
  tache?: TacheResume | null;
};

export default function TacheFormModal({ culteId, culteIntitule, culte, membres = [], typesTache = [], onClose = () => {}, tache = null }: TacheFormModalProps) {
  const [rechercheMembre, setRechercheMembre] = useState("");
  const [membresSelectionnes, setMembresSelectionnes] = useState<string[]>(tache?.equipe.map((e) => e.id) ?? []);
  const [dateTache, setDateTache] = useState<string | null>(tache?.dateTache ?? null);
  const [dateErreur, setDateErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toISOStringSafe = (dateVal: any) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().substring(0, 10);
  };

  const minDateISO = toISOStringSafe(culte?.dateCulte || culte?.dateDebut || culte?.startDate || culte?.date);
  const maxDateISO = toISOStringSafe(culte?.dateFin || culte?.dateCulteFin || culte?.endDate) || minDateISO;

  const membresFiltres = (membres ?? []).filter((m) => m.nomComplet.toLowerCase().includes(rechercheMembre.toLowerCase()));

  const toggleMembre = (id: string) => {
    if (membresSelectionnes.includes(id)) {
      setMembresSelectionnes(membresSelectionnes.filter((mId) => mId !== id));
    } else {
      setMembresSelectionnes([...membresSelectionnes, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDateErreur(null);
    setLoading(true);

    // Validation : la date de la tâche doit être comprise entre minDateISO et maxDateISO
    if (dateTache && minDateISO && maxDateISO) {
      if (dateTache < minDateISO || dateTache > maxDateISO) {
        alert(`La date de la tâche doit être comprise entre le ${minDateISO} et le ${maxDateISO}`);
        setLoading(false);
        return;
      }
    }

    const formData = new FormData(e.currentTarget);
    formData.append("culteId", culteId);
    if (tache?.id) {
      formData.append("id", tache.id);
    }
    membresSelectionnes.forEach((mId) => formData.append("membresEquipe", mId));
    if (dateTache) {
      formData.append("dateTache", dateTache);
    }
    try {
      await enregistrerTache(initialCulteFormState, formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-card-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-card-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">{tache ? "Modifier la tâche" : "Ajouter une tâche"}</h2>
            <p className="text-xs text-muted-foreground">{culteIntitule}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {tache?.id && <input type="hidden" name="id" defaultValue={tache.id} />}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Intitulé de la tâche *</label>
            <input type="text" name="titre" required defaultValue={tache?.titre ?? ""} placeholder="Ex: Louange, Prédication..." className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description / Consignes</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Détails ou consignes spécifiques..."
              defaultValue={tache?.description ?? ""}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Date de la tâche *</label>
            <input
              type="date"
              name="dateTache"
              min={minDateISO || undefined}
              max={maxDateISO || undefined}
              defaultValue={dateTache || minDateISO || undefined}
              onChange={(e) => setDateTache(e.target.value || null)}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {dateErreur && (
              <p className="text-xs text-red-500 font-medium">{dateErreur}</p>
            )}
            {!dateErreur && minDateISO && maxDateISO && (
              <p className="text-xs text-muted-foreground">
                Date comprise entre le {minDateISO} et le {maxDateISO}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Type de tâche</label>
            <select name="typeTacheId" defaultValue={tache?.typeTache?.id ?? ""} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">— Aucun type —</option>
              {(typesTache ?? []).map((t) => (<option key={t.id} value={t.id}>{t.libelle}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Responsable principal</label>
            <select name="responsableId" defaultValue={tache?.responsable?.id ?? ""} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">— Non assigné —</option>
              {(membres ?? []).map((m) => (<option key={m.id} value={m.id}>{m.nomComplet}</option>))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Équipe de travail</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input type="text" value={rechercheMembre} onChange={(e) => setRechercheMembre(e.target.value)} placeholder="Rechercher un membre..." className="w-full rounded-lg border border-card-border bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            {membresSelectionnes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {membresSelectionnes.map((mId) => {
                  const m = (membres ?? []).find((mem) => mem.id === mId);
                  if (!m) return null;
                  return (
                    <span key={mId} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary border border-primary/20">
                      {m.nomComplet}
                      <button type="button" onClick={() => toggleMembre(mId)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto rounded-lg border border-card-border bg-background p-2 space-y-1">
              {membresFiltres.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucun membre trouvé</p>
              ) : (
                membresFiltres.map((m) => {
                  const estCoche = membresSelectionnes.includes(m.id);
                  return (
                    <div key={m.id} onClick={() => toggleMembre(m.id)} className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm cursor-pointer transition-colors ${estCoche ? "bg-primary/20 text-foreground font-medium" : "hover:bg-accent text-muted-foreground hover:text-foreground"}`}>
                      <span>{m.nomComplet}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Heure de début</label>
              <input type="time" name="heureDebut" defaultValue={tache?.heureDebut ?? ""} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Heure de fin</label>
              <input type="time" name="heureFin" defaultValue={tache?.heureFin ?? ""} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Statut</label>
            <select name="statut" defaultValue={tache?.statut ?? "A_FAIRE"} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="A_FAIRE">À faire</option>
              <option value="EN_COURS">En cours</option>
              <option value="CLOTUREE">Clôturée</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-card-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-card-border text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Annuler</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/95 disabled:opacity-50">{loading ? "Enregistrement..." : "Enregistrer"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}