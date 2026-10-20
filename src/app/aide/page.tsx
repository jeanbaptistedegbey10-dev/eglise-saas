import type { Metadata } from "next";
import ChatbotAide from "@/components/layout/ChatbotAide";
export const metadata: Metadata = { title: "Aide", description: "Manuel d utilisation par rôles et chatbot d assistance." };
const GUIDES = [
  { role: "Administrateur", couleur: "border-violet-500/40", items: ["Comptes & accès : créer, changer de rôle, suspendre.", "Paramètres : identité légale, contacts & responsables, logo, devise & exercice.", "Données démo : Administration > Injecter / Supprimer.", "Journal d'audit : tracer toute action sensible."] },
  { role: "Trésorier", couleur: "border-emerald-500/40", items: ["Cotisations & barèmes : créer types, paliers, versement.", "Versements : montant de base, surplus, recus.", "Caisses : soldes, mouvements ENTREE/SORTIE, virements.", "Dépenses, rapports & clôture."] },
  { role: "Secrétariat", couleur: "border-blue-500/40", items: ["Membres : créer / modifier les fiches.", "Organisation : départements, groupes.", "Cultes : planifier le culte et les quêtes.", "Aucun accès aux finances ni aux dépenses."] },
  { role: "Pasteur", couleur: "border-indigo-500/40", items: ["Communauté : suivi pastoral et familles.", "Solidarité : aides et distributions.", "Cultes & événements.", "Dashboard pastoral."] },
];
export default function AidePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header><p className="text-sm font-medium text-accent">Assistance</p><h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Manuel d utilisation</h1><p className="text-sm text-muted-foreground">Guide interactif par rôles + réponses aux questions fréquentes.</p></header>
      <div className="grid gap-4 md:grid-cols-2">
        {GUIDES.map((g) => (
          <details key={g.role} open className={`rounded-2xl border ${g.couleur} bg-card p-5`}>
            <summary className="cursor-pointer text-lg font-semibold text-foreground">{g.role}</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{g.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </details>
        ))}
      </div>
      <section className="rounded-2xl border border-card-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Parcours rapides par rôle</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Nouveau membre : Communaute / Membres &gt; Nouveau.</li>
          <li>Versement : Finances / Cotisations (onglet Versements).</li>
          <li>Décaissement : Finances / Dépenses &gt; Nouvelle.</li>
          <li>Clôture : Rapports &amp; Clôture &gt; vérifier, puis cloturer l&apos;exercice.</li>
        </ol>
      </section>
      <ChatbotAide />
    </div>
  );
}
