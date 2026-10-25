"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { enregistrerCulte } from "@/actions/culte";
import { initialCulteFormState } from "@/types/culte";
import type { CulteResume } from "@/types/culte";

type MembreOption = { id: string; nomComplet: string; };
type CulteFormModalProps = {
  membres?: MembreOption[];
  onClose?: () => void;
  culte?: CulteResume | null;
};

export default function CulteFormModal({ membres = [], onClose = () => {}, culte = null }: CulteFormModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (culte?.id) {
      formData.append("id", culte.id);
    }
    try {
      await enregistrerCulte(initialCulteFormState, formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-lg rounded-2xl border border-card-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-card-border">
          <h2 className="text-xl font-bold text-foreground">{culte ? "Modifier l'événement" : "Programmer un événement"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {culte?.id && <input type="hidden" name="id" defaultValue={culte.id} />}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Intitulé de l'événement *</label>
            <input type="text" name="intitule" required defaultValue={culte?.intitule ?? ""} placeholder="Ex: Culte dominical, Vigile..." className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date de début *</label>
              <input type="date" name="date" required defaultValue={culte?.dateISO ?? ""} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date de fin</label>
              <input type="date" name="dateFin" defaultValue={culte?.dateFin ?? ""} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Heure de début</label>
              <input type="time" name="heureDebut" defaultValue={culte?.heureDebut ?? ""} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Heure de fin</label>
              <input type="time" name="heureFin" defaultValue={culte?.heureFin ?? ""} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Lieu</label>
            <input type="text" name="lieu" defaultValue={culte?.lieu ?? ""} placeholder="Ex: Grand Temple" className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea name="description" defaultValue={culte?.description ?? ""} placeholder="Ex: Culte avec partage de la Cène..." rows={3} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Thème du culte</label>
            <input type="text" name="theme" defaultValue={culte?.theme ?? ""} placeholder="Ex: Grâce, Pardon, Espérance..." className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description du thème / Verset biblique</label>
            <textarea name="descriptionTheme" defaultValue={culte?.descriptionTheme ?? ""} placeholder="Ex: Jean 3:16 — Car Dieu a tant aimé le monde..." rows={3} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Type d'événement</label>
              <select name="type" defaultValue={culte?.type ?? "OPTIONNEL"} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="OPTIONNEL">Optionnel</option>
                <option value="RESPONSABILISE">Responsabilisé</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Statut</label>
              <select name="statut" defaultValue={culte?.statut ?? "PLANIFIE"} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="PLANIFIE">Planifié</option>
                <option value="TERMINE">Terminé</option>
                <option value="ANNULE">Annulé</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Responsable général</label>
            <select name="responsableMembreId" defaultValue={culte?.responsable?.id ?? ""} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">— Non assigné —</option>
              {(membres ?? []).map((m) => (<option key={m.id} value={m.id}>{m.nomComplet}</option>))}
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