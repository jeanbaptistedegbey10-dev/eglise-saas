"use client";

import { useEffect } from "react";
import { Printer, X, Calendar, MapPin, FileText, User } from "lucide-react";
import type { CulteResume } from "@/types/culte";

type ProgrammePdfExportProps = { culte: CulteResume; onClose: () => void; };

export default function ProgrammePdfExport({ culte, onClose }: ProgrammePdfExportProps) {
  useEffect(() => {
    const timer = setTimeout(() => { window.print(); }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-card-border bg-card p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-card-border no-print">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Printer className="h-5 w-5 text-primary" />
            <span>Aperçu du Programme / Fiche A4</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Imprimer</button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="space-y-6 bg-card text-foreground p-6 rounded-xl border border-card-border print:border-none print:p-0">
          <div className="text-center space-y-2 pb-6 border-b border-card-border">
            <h1 className="text-2xl font-bold uppercase tracking-wide">{culte.intitule}</h1>
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {culte.dateISO ? new Date(culte.dateISO).toLocaleDateString("fr-FR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Date non définie"}
                {culte.dateFin && ` au ${new Date(culte.dateFin).toLocaleDateString("fr-FR")}`}
              </span>
              {culte.lieu && (<span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {culte.lieu}</span>)}
              {culte.responsable && (
                <span className="flex items-center gap-1 ml-2">
                  <User className="h-4 w-4" /> {culte.responsable.nomComplet}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Déroulé et Tâches</h3>
            {(!culte.taches || culte.taches.length === 0) ? (
              <p className="text-sm text-muted-foreground italic text-center py-6 border border-dashed border-card-border rounded-lg">Aucune tâche enregistrée.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-card-border bg-accent/50 text-muted-foreground">
                      <th className="p-3">Horaire</th>
                      <th className="p-3">Activité</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Responsable & Équipe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {culte.taches.map((tache) => (
                      <tr key={tache.id} className="hover:bg-accent/20">
                        <td className="p-3 font-mono text-xs whitespace-nowrap">{tache.heureDebut || "--:--"} {tache.heureFin && `- ${tache.heureFin}`}</td>
                        <td className="p-3 font-medium">{tache.titre}</td>
                        <td className="p-3">{tache.typeTache ? (<span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">{tache.typeTache.libelle}</span>) : (<span className="text-muted-foreground text-xs">—</span>)}</td>
                        <td className="p-3 text-xs">
                          <div>{tache.responsable?.nomComplet || "Non assigné"}</div>
                          {tache.equipe && tache.equipe.length > 0 && (<div className="text-muted-foreground mt-0.5">Équipe : {tache.equipe.length} membre(s)</div>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}