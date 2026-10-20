import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Church,
  CircleAlert,
  Coins,
  HandCoins,
  Users,
} from "lucide-react";
import { CarteMetier } from "@/components/dashboard/CarteMetier";
import { construireCartesMetier, roleDashboard } from "@/components/dashboard/cartes-dashboard";
import { formatMontant } from "@/lib/finance";
import { aAccesAuChemin } from "@/lib/permissions";
import { LIBELLES_ROLE } from "@/lib/utilisateur";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifierEtRestaurerAdminPrincipal } from "@/actions/restaurer-admin";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Vue d'ensemble & accès rapides : cartes métier par rôle (membres, cultes, finances, administration…).",
};

export const dynamic = "force-dynamic";

type CulteAVenir = {
  id: string;
  intitule: string;
  dateAffichee: string;
  totalQueteAnonyme: number;
};

type BarreActivite = { libelle: string; montant: number };

function formaterDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  // Session unique : sert au filet de sécurité (restauration admin) ET au
  // filtrage des cartes métier par `session.user.role`.
  const session = await auth().catch(() => null);
  const role = roleDashboard(session?.user?.role ?? null);

  // Filet de sécurité : restaure ADMINISTRATEUR si le compte principal
  // connecté (jeanbaptistedegbey10@gmail.com) a perdu son rôle.
  try {
    if (session?.user) {
      await verifierEtRestaurerAdminPrincipal(session).catch(() => null);
    }
  } catch {
    // Ignore : la page reste affichable même si la vérification échoue.
  }

  let nombreMembres = 0;
  let totalEncaisse = 0;
  let totalDecaisse = 0;
  let cotisationsDuMois = 0;
  let soldeCaisses = 0;
  let cultesAVenir: CulteAVenir[] = [];
  let activite: BarreActivite[] = [];
  let exerciceLibelle: string | null = null;
  let erreurBase: string | null = null;
  // Compteurs des cartes métier (Administration, Patrimoine, Solidarité…).
  let nombreComptes = 0;
  let nombreBiens = 0;
  let nombreAides = 0;
  let nouvellesFichesMois = 0;
  let nombreGroupesDepartements = 0;
  let ficheMembreSession: {
    trouve: boolean;
    nombreVersements: number;
    nombreAidesRecues: number;
  } | null = null;

  try {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const [compteMembres, exercices, comptes, biens, aides, fichesDuMois, groupes, departements] =
      await Promise.all([
        prisma.membre.count(),
        prisma.exercice.findMany({ orderBy: { annee: "desc" } }),
        prisma.utilisateur.count(),
        prisma.bienPatrimoine.count(),
        prisma.aideDistribution.count(),
        prisma.membre.count({ where: { createdAt: { gte: debutMois } } }),
        prisma.groupe.count(),
        prisma.departement.count(),
      ]);
    nombreMembres = compteMembres;
    nombreComptes = comptes;
    nombreBiens = biens;
    nombreAides = aides;
    nouvellesFichesMois = fichesDuMois;
    nombreGroupesDepartements = groupes + departements;
    const exerciceCourant =
      exercices.find((e) => !e.cloture) ?? exercices[0] ?? null;
    exerciceLibelle = exerciceCourant?.libelle ?? null;
    const [versements, paiements, depenses, cultes, caisses] = await Promise.all([
      exerciceCourant
        ? prisma.versementCotisation.findMany({
            where: { cotisation: { exerciceId: exerciceCourant.id } },
            select: { montant: true, dateVersement: true },
          })
        : Promise.resolve([]),
      exerciceCourant
        ? prisma.paiement.findMany({
            where: { exerciceId: exerciceCourant.id },
            select: { montant: true, datePaiement: true },
          })
        : Promise.resolve([]),
      exerciceCourant
        ? prisma.depense.findMany({
            where: { exerciceId: exerciceCourant.id },
            select: { montant: true },
          })
        : Promise.resolve([]),
      prisma.culte.findMany({
        where: { date: { gte: maintenant } },
        orderBy: { date: "asc" },
        take: 4,
      }),
      prisma.caisse.findMany({ select: { soldeActuel: true } }),
    ]);
    const parMois = new Map<string, number>();
    for (const v of versements) {
      const montant = Number(v.montant);
      totalEncaisse += montant;
      if (v.dateVersement >= debutMois) cotisationsDuMois += montant;
      const cle = `${v.dateVersement.getFullYear()}-${String(v.dateVersement.getMonth() + 1).padStart(2, "0")}`;
      parMois.set(cle, (parMois.get(cle) ?? 0) + montant);
    }
    for (const p of paiements) {
      const montant = Number(p.montant);
      totalEncaisse += montant;
      if (p.datePaiement >= debutMois) cotisationsDuMois += montant;
      const cle = `${p.datePaiement.getFullYear()}-${String(p.datePaiement.getMonth() + 1).padStart(2, "0")}`;
      parMois.set(cle, (parMois.get(cle) ?? 0) + montant);
    }
    for (const d of depenses) totalDecaisse += Number(d.montant);
    for (const c of caisses) soldeCaisses += Number(c.soldeActuel);
    activite = [...parMois.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-6)
      .map(([cle, montant]) => ({ libelle: cle, montant }));
    cultesAVenir = cultes.map((c) => ({
      id: c.id,
      intitule: c.intitule,
      dateAffichee: formaterDate(c.date),
      totalQueteAnonyme: Number(c.totalQueteAnonyme),
    }));

    // Rôle MEMBRE_CONSULTATION : fiche membre rattachée au compte connecté
    // (compteurs « Fiche Personnelle », « Historique Cotisations »,
    // « Demandes d'Aide » — cartes purement informatives, sans navigation).
    if (role === "MEMBRE_CONSULTATION" && session?.user?.email) {
      const fiche = await prisma.membre.findUnique({
        where: { email: session.user.email },
        select: {
          _count: { select: { versementsCotisation: true, paiements: true, aidesRecues: true } },
        },
      });
      ficheMembreSession = {
        trouve: Boolean(fiche),
        nombreVersements: fiche
          ? fiche._count.versementsCotisation + fiche._count.paiements
          : 0,
        nombreAidesRecues: fiche?._count.aidesRecues ?? 0,
      };
    }
  } catch (erreur) {
    console.error("Erreur dashboard :", erreur);
    erreurBase = "Impossible de joindre la base de données. Vérifiez DATABASE_URL puis réessayez.";
  }

  const maxActivite = activite.reduce((m, b) => Math.max(m, b.montant), 0);
  // Cartes métier affichées / masquées selon le rôle de l'utilisateur connecté.
  const cartesMetier = construireCartesMetier(role, {
    nombreMembres,
    nombreCultesAVenir: cultesAVenir.length,
    totalEncaisse,
    totalDecaisse,
    cotisationsDuMois,
    soldeCaisses,
    nombreComptes,
    nombreBiens,
    nombreAides,
    nouvellesFichesMois,
    nombreGroupesDepartements,
    ficheMembreSession,
  });
  // Étanchéité : seuls ADMINISTRATEUR / TRESORIER consultent les données
  // financières du dashboard (activités, encaissements, décaissements).
  const voitFinances = role === "ADMINISTRATEUR" || role === "TRESORIER";
  const voitRapports = aAccesAuChemin(role, "/rapports");
  // Actions rapides filtrées RBAC (masquées si le rôle n'a aucun accès).
  const actionsRapides = [
    { href: "/finances/cotisations?tab=versements", libelle: "Nouveau versement", icone: HandCoins },
    { href: "/membres", libelle: "Ajouter un membre", icone: Users },
    { href: "/cultes", libelle: "Saisir un culte", icone: CalendarDays },
  ].filter((action) => aAccesAuChemin(role, action.href));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Vue d&apos;ensemble</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Synthèse paroissiale{exerciceLibelle ? ` — exercice ${exerciceLibelle}` : ""}.
          </p>
        </div>
        {voitRapports && (
          <Link
            href="/rapports"
            className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Voir les rapports
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </header>
      {erreurBase ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-600 dark:text-red-300">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erreurBase}</span>
        </div>
      ) : (
        <>
          <section aria-label="Accès rapides par module" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">
                Accès rapides — {LIBELLES_ROLE[role]}
              </h2>
              <span className="rounded-full border border-card-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                {cartesMetier.length} module{cartesMetier.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cartesMetier.map((carte) => (
                <CarteMetier key={carte.id} {...carte} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            {voitFinances && (
              <section aria-label="Activité récente" className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm lg:col-span-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Activity className="h-4 w-4 text-accent" aria-hidden />
                    Activité récente
                  </h2>
                  <Link href="/finances/cotisations?tab=versements" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                    Détail des versements
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
                {activite.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun encaissement enregistré pour l&apos;exercice courant.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5" aria-label="Encaissements par mois">
                    {activite.map((barre) => (
                      <li key={barre.libelle} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-foreground">{barre.libelle}</span>
                          <span className="font-semibold tabular-nums text-foreground">{formatMontant(barre.montant)} FCFA</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${barre.libelle} : ${formatMontant(barre.montant)} FCFA`}>
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${maxActivite > 0 ? Math.max(4, Math.round((barre.montant / maxActivite) * 100)) : 0}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  Encaissé exercice : {formatMontant(totalEncaisse)} FCFA · Décaissé : {formatMontant(totalDecaisse)} FCFA.
                </p>
              </section>
            )}

            <div className={voitFinances ? "flex flex-col gap-3 lg:col-span-2" : "flex flex-col gap-3 lg:col-span-5"}>
              <section aria-label="Cultes à venir" className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <CalendarDays className="h-4 w-4 text-accent" aria-hidden />
                    Cultes à venir
                  </h2>
                  {aAccesAuChemin(role, "/cultes") && (
                    <Link href="/cultes" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                      Calendrier
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
                {cultesAVenir.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-card-border bg-card/60 px-6 py-8 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Church className="h-6 w-6 text-muted-foreground" aria-hidden />
                    </span>
                    <p className="text-sm font-medium text-foreground">Aucun culte à venir</p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {cultesAVenir.map((culte) => (
                      <li key={culte.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-card-border bg-background/60 px-4 py-3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">{culte.intitule}</span>
                          <span className="truncate text-xs capitalize text-muted-foreground">{culte.dateAffichee}</span>
                        </div>
                        {voitFinances && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium tabular-nums text-accent">
                            <Coins className="h-3.5 w-3.5" aria-hidden />
                            {formatMontant(culte.totalQueteAnonyme)} FCFA
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {actionsRapides.length > 0 && (
                <section aria-label="Actions rapides" className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-foreground">Actions rapides</h2>
                  <div className="flex flex-col gap-2">
                    {actionsRapides.map(({ href, libelle, icone: IconAction }, index) => (
                      <Link
                        key={href}
                        href={href}
                        className={
                          index === 0
                            ? "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            : "inline-flex items-center gap-2 rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                        }
                      >
                        <IconAction className="h-4 w-4" aria-hidden />
                        {libelle}
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
