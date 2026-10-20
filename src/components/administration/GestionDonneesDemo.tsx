"use client";

import { useState, useRef } from "react";
import { injecterDonneesDemo, purgerDonneesDemo } from "@/actions/demo-data";

export interface EtatAction {
  statut: "idle" | "loading" | "success" | "error";
  message: string;
}

export default function GestionDonneesDemo() {
  const [etatInjection, setEtatInjection] = useState<EtatAction>({
    statut: "idle",
    message: "",
  });
  const [etatPurge, setEtatPurge] = useState<EtatAction>({
    statut: "idle",
    message: "",
  });
  const [etapeInjection, setEtapeInjection] = useState<number>(0);
  const stepRef = useRef<number>(0);

  const ETAPES_INJECTION: { num: number; libelle: string }[] = [
    { num: 1, libelle: "Nettoyage BDD…" },
    { num: 2, libelle: "Création exercices…" },
    { num: 3, libelle: "Création 20 membres…" },
    { num: 4, libelle: "Injection cotisations & cultes…" },
    { num: 5, libelle: "Terminé !" },
  ];

  const advanceSteps = async () => {
    for (let i = 1; i <= ETAPES_INJECTION.length; i++) {
      stepRef.current = i;
      setEtapeInjection(i);
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  };

  const handleInjection = async () => {
    setEtapeInjection(0);
    stepRef.current = 0;
    setEtatInjection({ statut: "loading", message: "Injection en cours…" });
    try {
      advanceSteps();
      const resultat = await injecterDonneesDemo();
      setEtapeInjection(ETAPES_INJECTION.length);
      stepRef.current = ETAPES_INJECTION.length;
      if (resultat.ok) {
        setEtatInjection({ statut: "success", message: resultat.message });
      } else {
        setEtatInjection({ statut: "error", message: resultat.message });
      }
    } catch (erreur: any) {
      setEtatInjection({
        statut: "error",
        message: erreur?.message ?? "Erreur inattendue.",
      });
    }
  };

  const handlePurge = async () => {
    setEtatPurge({ statut: "loading", message: "Purge en cours…" });
    try {
      const resultat = await purgerDonneesDemo();
      if (resultat.ok) {
        setEtatPurge({ statut: "success", message: resultat.message });
      } else {
        setEtatPurge({ statut: "error", message: resultat.message });
      }
    } catch (erreur: any) {
      setEtatPurge({
        statut: "error",
        message: erreur?.message ?? "Erreur inattendue.",
      });
    }
  };

  const badge = (statut: EtatAction["statut"]) => {
    switch (statut) {
      case "idle":
        return "text-slate-500";
      case "loading":
        return "text-indigo-600 animate-pulse";
      case "success":
        return "text-emerald-600";
      case "error":
        return "text-rose-600";
      default:
        return "text-slate-500";
    }
  };

  const libelleStatut = (statut: EtatAction["statut"]) => {
    switch (statut) {
      case "idle":
        return "Inactif";
      case "loading":
        return "En cours…";
      case "success":
        return "Réussi";
      case "error":
        return "Erreur";
      default:
        return "Inactif";
    }
  };

  const etapeActive = (num: number) => etapeInjection >= num;
  const etapeEnCours = (num: number) => etapeInjection === num;

  return (
    <section className="mt-8 border rounded-xl p-6 bg-card text-card-foreground">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-indigo-600">📦</span>
        Gestion des Données de Démonstration
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Injectez ou supprimez les données de test (membres, cotisations,
        caisses, cultes, aides, dépenses…). Réservé aux{" "}
        <strong>Administrateurs</strong>. Le compte principal{" "}
        <code className="text-xs">jeanbaptistedegbey10@gmail.com</code> est
        toujours préservé.
      </p>

      {etatInjection.statut !== "idle" && (
        <div className="mb-6 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <span className="text-indigo-600">📋</span> Progression injection
          </h3>
          <div className="space-y-2">
            {ETAPES_INJECTION.map((etape) => (
              <div key={etape.num} className="flex items-center gap-3">
                <span
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${etapeActive(etape.num)
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground border border-border"}
                  `}
                >
                  {etape.num}
                </span>
                <span
                  className={`text-sm ${etapeActive(etape.num) ? "font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  [{etape.num}/5] {etape.libelle}
                </span>
                {etapeEnCours(etape.num) && (
                  <span className="ml-2 text-xs text-indigo-600 animate-pulse">
                    ⏳
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-muted/50">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <span className="text-emerald-600">➕</span> Injecter
          </h3>
          <button
            onClick={handleInjection}
            disabled={etatInjection.statut === "loading"}
            className="w-full py-2 px-4 rounded border border-indigo-300 bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
          >
            {etatInjection.statut === "loading"
              ? "Injection…"
              : "Injecter les données"}
          </button>
          {etatInjection.statut !== "idle" && (
            <div className={`mt-3 text-sm font-medium ${badge(etatInjection.statut)}`}>
              {libelleStatut(etatInjection.statut)}: {etatInjection.message}
            </div>
          )}
        </div>

        <div className="p-4 border rounded-lg bg-muted/50">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <span className="text-rose-600">🗑️</span> Purger
          </h3>
          <button
            onClick={handlePurge}
            disabled={etatPurge.statut === "loading"}
            className="w-full py-2 px-4 rounded border border-rose-300 bg-rose-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition"
          >
            {etatPurge.statut === "loading"
              ? "Purge…"
              : "Supprimer les données démo"}
          </button>
          {etatPurge.statut !== "idle" && (
            <div className={`mt-3 text-sm font-medium ${badge(etatPurge.statut)}`}>
              {libelleStatut(etatPurge.statut)}: {etatPurge.message}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          Après une injection ou une purge, les pages sont automatiquement
          rechargées pour afficher les données à jour.
        </p>
      </div>
    </section>
  );
}