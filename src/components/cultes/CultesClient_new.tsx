"use client";

import React, { useState } from "react";
import { CalendarDays, List, Settings2 } from "lucide-react";

export default function CultesClient({ cultes = [], membres = [], typesTache = [] }: any) {
  const [cultePourPdf, setCultePourPdf] = useState<any | null>(null);
  const [culteEnEditionId, setCulteEnEditionId] = useState<string | null>(null);
  const [culteASupprimerId, setCulteASupprimerId] = useState<string | null>(null);
  const [ongletActif, setOngletActif] = useState<"evenements" | "taches" | "config">("evenements");

  return (
    <div className="w-full space-y-6">
      {/* Header & Title removed - displayed by parent layout */}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between">
        {/* Left: Tab pills */}
        <div className="bg-card/60 border border-card-border p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setOngletActif("evenements")}
            className={`p-2 rounded-lg ${ongletActif === "evenements" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <CalendarDays className="h-4 w-4" aria-hidden /> Calendrier & Ã‰vÃ©nements
          </button>
          <button
            onClick={() => setOngletActif("taches")}
            className={`p-2 rounded-lg ${ongletActif === "taches" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <List className="h-4 w-4" aria-hidden /> TÃ¢ches & DÃ©roulÃ©
          </button>
          <button
            onClick={() => setOngletActif("config")}
            className={`p-2 rounded-lg ${ongletActif === "config" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <Settings2 className="h-4 w-4" aria-hidden /> Configuration
          </button>
        </div>

        {/* Right: Add button */}
        <button className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium shadow-sm hover:opacity-90 transition-all">
          + Programmer un Ã©vÃ©nement
        </button>
      </div>

      {/* Events Filter */}
      <div className="flex gap-2">
        <button className="px-4 py-1 rounded-lg bg-card/30 text-sm hover:bg-card/50 transition-all">Ã€ venir</button>
        <button className="px-4 py-1 rounded-lg bg-card/30 text-sm hover:bg-card/50 transition-all">PassÃ©s</button>
        <button className="px-4 py-1 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all">Tous</button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
        {cultes.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-card border border-card-border rounded-2xl">
            Aucun Ã©vÃ©nement planifiÃ© pour le moment.
          </div>
        ) : (
          cultes.map((culte: any) => (
            <div key={culte.id} className="p-5 bg-card border border-card-border rounded-2xl text-card-foreground space-y-4">
              <h3 className="font-semibold text-lg">{culte.titre || "Culte sans titre"}</h3>
              <p className="text-sm text-muted-foreground">{culte.date ? new Date(culte.date).toLocaleDateString("fr-FR") : "Date non fixÃ©e"}</p>
              
              <div className="flex items-center gap-2 pt-2 border-t border-card-border">
                <button
                  onClick={() => setCultePourPdf(culte)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                >
                  AperÃ§u & ContrÃ´le
                </button>
                <button
                  onClick={() => setCulteEnEditionId(culte.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-500/10 text-gray-300 hover:bg-gray-500/20"
                >
                  Modifier
                </button>
                <button
                  onClick={() => setCulteASupprimerId(culte.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
