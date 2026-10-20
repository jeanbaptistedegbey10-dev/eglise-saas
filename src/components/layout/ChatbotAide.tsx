"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { RoleUtilisateurValeur } from "@/lib/utilisateur";
import { LIBELLES_ROLE } from "@/lib/utilisateur";

interface FaqEntree {
  motsCles: string[];
  question: string;
  reponse: string;
  roles?: RoleUtilisateurValeur[];
}

const FAQ_PAR_ROLE: Record<RoleUtilisateurValeur, FaqEntree[]> = {
  ADMINISTRATEUR: [
    {
      motsCles: ["données", "démo", "injecter", "purger"],
      question: "Comment injecter ou purger les données de démonstration ?",
      reponse:
        "Rendez-vous dans Paramètres > Gestion des données de démonstration. Seuls les Administrateurs peuvent injecter ou supprimer les données de test.",
      roles: ["ADMINISTRATEUR"],
    },
    {
      motsCles: ["rôle", "permissions", "administrateur"],
      question: "Quels droits a un Administrateur ?",
      reponse:
        "L’Administrateur a accès à tous les modules : communauté, finances, cultes, solidarité, rapports.",
      roles: ["ADMINISTRATEUR"],
    },
    {
      motsCles: ["compte", "créer", "utilisateur"],
      question: "Comment créer ou suspendre un compte utilisateur ?",
      reponse:
        "Allez dans Administration > Utilisateurs. Seuls les Administrateurs peuvent créer des comptes et modifier les rôles.",
      roles: ["ADMINISTRATEUR"],
    },
    {
      motsCles: ["audit", "journal"],
      question: "Où consulter le journal d’audit ?",
      reponse:
        "Le journal d’audit est accessible depuis Administration > Audit.",
      roles: ["ADMINISTRATEUR"],
    },
  ],
  TRESORIER: [
    {
      motsCles: ["cotisation", "versement", "caisse"],
      question: "Comment enregistrer une cotisation ou un versement ?",
      reponse:
        "Utilisez le module Finances pour saisir les cotisations, les versements et gérer les caisses.",
      roles: ["TRESORIER"],
    },
    {
      motsCles: ["rapport", "bilan"],
      question: "Comment générer un rapport financier ?",
      reponse:
        "Accédez au module Rapports pour consulter les bilans par exercice.",
      roles: ["TRESORIER"],
    },
  ],
  PASTEUR: [
    {
      motsCles: ["aide", "solidarité"],
      question: "Comment enregistrer une aide de solidarité ?",
      reponse:
        "Depuis le module Solidarité, vous pouvez créer des distributions d’aide.",
      roles: ["PASTEUR"],
    },
    {
      motsCles: ["culte", "événement"],
      question: "Comment gérer les cultes et événements ?",
      reponse:
        "Le module Cultes permet de créer et suivre les cultes et événements.",
      roles: ["PASTEUR"],
    },
  ],
  SECRETARIAT: [
    {
      motsCles: ["membre", "fiche"],
      question: "Comment saisir une fiche membre ?",
      reponse:
        "Allez dans le module Membres pour créer et mettre à jour les fiches des membres.",
      roles: ["SECRETARIAT"],
    },
    {
      motsCles: ["groupe", "département"],
      question: "Comment gérer les groupes et départements ?",
      reponse:
        "Le module Organisation permet de créer des départements et des groupes.",
      roles: ["SECRETARIAT"],
    },
  ],
  MEMBRE_CONSULTATION: [
    {
      motsCles: ["relevé", "cotisation"],
      question: "Comment consulter mon relevé de cotisations ?",
      reponse:
        "Accédez à votre relevé personnel depuis votre tableau de bord.",
      roles: ["MEMBRE_CONSULTATION"],
    },
  ],
};

const TOUTES_ENTREES: FaqEntree[] = Object.values(FAQ_PAR_ROLE).flat();


export default function ChatbotAide() {
  const { data: session } = useSession();
  const [ouvert, setOuvert] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleUtilisateurValeur | null>(null);

  useEffect(() => {
    setRole((session?.user as { role?: RoleUtilisateurValeur } | undefined)?.role ?? null);
  }, [session]);

  const entreesFiltrees = TOUTES_ENTREES.filter((e) => {
    if (e.roles && e.roles.length > 0 && !e.roles.includes(role as RoleUtilisateurValeur)) {
      return false;
    }
    return true;
  });

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setOuvert(!ouvert)}
        className="rounded-full bg-indigo-600 px-4 py-2 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        aria-label={ouvert ? "Fermer l’aide" : "Ouvrir l’aide"}
      >
        {ouvert ? "✕" : "? Aide"}
      </button>

      {ouvert && (
        <div className="mt-2 w-80 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Aide rapide</h3>
            <a
              href="/aide"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Manuel complet
            </a>
          </div>

          <div className="p-3">
            <input
              type="text"
              placeholder="Rechercher (ex: cotisation, caisse, membre…)"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              className="w-full text-sm px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {entreesFiltrees
              .filter((e) => {
                if (!query) return true;
                const q = query.toLowerCase();
                return e.motsCles.some((m) => m.toLowerCase().includes(q)) || e.question.toLowerCase().includes(q);
              })
              .map((e, i) => (
                <div key={i} className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-2">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{e.question}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{e.reponse}</p>
                  {e.roles && e.roles.length > 0 && (
                    <span className="text-[10px] uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      {e.roles.map((r) => LIBELLES_ROLE[r]).join(", ")}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export {};