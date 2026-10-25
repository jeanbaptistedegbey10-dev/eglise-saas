"use client";

import { useState } from "react";
import { Archive, FileText } from "lucide-react";
import type { Exercice } from "@/generated/prisma/client";
import type { MembreOption } from "@/types/solidarite";
import RapportModal from "./RapportModal";

type ModeRapport = "exercice" | "historique";

const SELECT =
  "h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

export default function RapportActionsBar({
  membres,
  exercices,
}: {
  membres: MembreOption[];
  exercices: Exercice[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModeRapport>("exercice");
  const [exerciceId, setExerciceId] = useState<string | null>(null);

  const exerciceEnCours = (exercices ?? []).find((e) => !e.cloture);

  const ouvrir = (mde: ModeRapport) => {
    setMode(mde);
    setOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="rapport-bar-exercice" className="text-xs font-medium text-muted-foreground">
            Exercice
          </label>
          <select
            id="rapport-bar-exercice"
            value={exerciceId ?? ""}
            onChange={(e) => setExerciceId(e.target.value ? e.target.value : null)}
            className={SELECT}
          >
            <option value="">
              — {exerciceEnCours ? `${exerciceEnCours.libelle} (${exerciceEnCours.annee})` : "Exercice en cours"} —
            </option>
            {exercices.map((e) => (
              <option key={e.id} value={e.id}>
                {e.libelle} ({e.annee}){e.cloture ? " — clôturé" : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => ouvrir("exercice")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <FileText className="h-4 w-4" aria-hidden /> Rapport par exercice
        </button>
        <button
          type="button"
          onClick={() => ouvrir("historique")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Archive className="h-4 w-4" aria-hidden /> Rapport global (Historique)
        </button>
      </div>

      <RapportModal
        open={open}
        membres={membres}
        membrePreselectionne={null}
        modeInitial={mode}
        exerciceIdInitial={exerciceId}
        exercices={exercices}
        onFermer={() => setOpen(false)}
      />
    </>
  );
}