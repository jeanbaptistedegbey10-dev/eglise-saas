import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CircleAlert, FolderTree, Plus, Users } from "lucide-react";

import DepartementFormModal from "@/components/organisation/DepartementFormModal";
import GroupeFormModal from "@/components/organisation/GroupeFormModal";
import GererMembresDepartementModal from "@/components/organisation/GererMembresDepartementModal";
import GererMembresGroupeModal from "@/components/organisation/GererMembresGroupeModal";
import SupprimerDepartementButton from "@/components/organisation/SupprimerDepartementButton";
import SupprimerGroupeButton from "@/components/organisation/SupprimerGroupeButton";
import { BadgeBureau } from "@/components/organisation/ui";
import { prisma } from "@/lib/prisma";
import type { DepartementOption, GroupeOption, MembreLie, MembreOptionOrganisation } from "@/types/organisation";
import { libelleRole } from "@/types/organisation";

export const metadata: Metadata = {
  title: "Organisation",
  description: "Gérez les départements, les groupes et les responsabilités de la sous-communauté.",
};

// Les données sont lues à chaque requête : le tableau reste toujours à jour
// après une Server Action, et le build ne dépend pas d'une base accessible.
export const dynamic = "force-dynamic";

type DepartementAffiche = {
  id: string;
  nom: string;
  description: string | null;
  aUnBureau: boolean;
  responsableNom: string | null;
  membres: MembreLie[];
  nombreGroupes: number;
};

type GroupeAffiche = {
  id: string;
  nom: string;
  description: string | null;
  aUnBureau: boolean;
  estSousGroupe: boolean;
  parentNom: string | null;
  departementId: string | null;
  departementNom: string | null;
  responsableNom: string | null;
  membres: MembreLie[];
  nombreSousGroupes: number;
};

function nomComplet(p: { nom: string; prenoms: string } | null): string | null {
  if (!p) return null;
  return `${p.prenoms} ${p.nom}`.trim();
}

async function chargerOrganisation(): Promise<{
  departements: DepartementAffiche[];
  groupes: GroupeAffiche[];
  membres: MembreOptionOrganisation[];
}> {
  const [deptRows, grpRows, membreRows] = await Promise.all([
    prisma.departement.findMany({
      orderBy: { nom: "asc" },
      include: {
        responsable: { select: { nom: true, prenoms: true } },
        membres: { include: { membre: { select: { nom: true, prenoms: true } } } },
        _count: { select: { groupes: true } },
      },
    }),
    prisma.groupe.findMany({
      orderBy: { nom: "asc" },
      include: {
        responsable: { select: { nom: true, prenoms: true } },
        departement: { select: { id: true, nom: true } },
        parent: { select: { nom: true } },
        membres: { include: { membre: { select: { nom: true, prenoms: true } } } },
        _count: { select: { sousGroupes: true } },
      },
    }),
    prisma.membre.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, prenoms: true, telephone: true },
    }),
  ]);

  return {
    departements: deptRows.map((d) => ({
      id: d.id,
      nom: d.nom,
      description: d.description,
      aUnBureau: d.aUnBureau,
      responsableNom: nomComplet(d.responsable),
      membres: d.membres.map((m) => ({
        membreId: m.membreId,
        nom: nomComplet(m.membre) ?? "",
        role: m.role as MembreLie["role"],
      })),
      nombreGroupes: d._count.groupes,
    })),
    groupes: grpRows.map((g) => ({
      id: g.id,
      nom: g.nom,
      description: g.description,
      aUnBureau: g.aUnBureau,
      estSousGroupe: g.estSousGroupe,
      parentNom: g.parent?.nom ?? null,
      departementId: g.departement?.id ?? null,
      departementNom: g.departement?.nom ?? null,
      responsableNom: nomComplet(g.responsable),
      membres: g.membres.map((m) => ({
        membreId: m.membreId,
        nom: nomComplet(m.membre) ?? "",
        role: m.role as MembreLie["role"],
      })),
      nombreSousGroupes: g._count.sousGroupes,
    })),
    membres: membreRows.map((m) => ({
      id: m.id,
      nom: m.nom,
      prenoms: m.prenoms,
      telephone: m.telephone,
    })),
  };
}

export default async function OrganisationPage() {
  let departements: DepartementAffiche[] = [];
  let groupes: GroupeAffiche[] = [];
  let membres: MembreOptionOrganisation[] = [];
  let erreurBase: string | null = null;

  try {
    const data = await chargerOrganisation();
    departements = data.departements;
    groupes = data.groupes;
    membres = data.membres;
  } catch (error) {
    console.error("Erreur lors du chargement de l'organisation :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  if (erreurBase) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erreurBase}</span>
        </div>
      </div>
    );
  }

  const departementOptions: DepartementOption[] = departements.map((d) => ({ id: d.id, nom: d.nom }));
  const groupeOptions: GroupeOption[] = groupes.map((g) => ({ id: g.id, nom: g.nom }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Organisation</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Départements &amp; groupes
          </h1>
          <p className="text-sm text-muted-foreground">
            Structurez la sous-communauté : départements, groupes et responsabilités.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DepartementFormModal membres={membres} triggerLabel="Nouveau département" />
          <GroupeFormModal membres={membres} departements={departementOptions} groupes={groupeOptions} />
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">Départements</h2>
          <span className="rounded-full border border-card-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {departements.length}
          </span>
        </div>

        {departements.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
            Aucun département. Créez-en un avec le bouton « Nouveau département ».
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {departements.map((d) => (
              <article key={d.id} className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold text-foreground">{d.nom}</h3>
                    {d.responsableNom && (
                      <p className="text-xs text-muted-foreground">Responsable : {d.responsableNom}</p>
                    )}
                  </div>
                  <BadgeBureau aUnBureau={d.aUnBureau} />
                </div>
                {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                <p className="text-xs text-muted-foreground">
                  {d.membres.length} membre{d.membres.length > 1 ? "s" : ""} · {d.nombreGroupes} groupe
                  {d.nombreGroupes > 1 ? "s" : ""}
                </p>
                <ul className="flex flex-col gap-1">
                  {d.membres.map((m) => (
                    <li key={m.membreId} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{m.nom}</span>
                      <span className="text-xs text-muted-foreground">{libelleRole(m.role)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
                  <DepartementFormModal membres={membres} departement={{ id: d.id, nom: d.nom, description: d.description, aUnBureau: d.aUnBureau, responsableId: null, bureauIds: [] }} triggerLabel="Modifier" />
                  <GererMembresDepartementModal departementId={d.id} nom={d.nom} actuels={d.membres} membres={membres} />
                  <SupprimerDepartementButton departementId={d.id} nom={d.nom} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">Groupes</h2>
          <span className="rounded-full border border-card-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {groupes.length}
          </span>
        </div>

        {groupes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
            Aucun groupe. Créez-en un avec le bouton « Nouveau groupe ».
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {groupes.map((g) => (
              <article key={g.id} className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold text-foreground">{g.nom}</h3>
                    <p className="text-xs text-muted-foreground">
                      {g.estSousGroupe && g.parentNom
                        ? `Sous-groupe de ${g.parentNom}`
                        : g.departementNom ?? "Groupe indépendant"}
                    </p>
                    {g.responsableNom && (
                      <p className="text-xs text-muted-foreground">Responsable : {g.responsableNom}</p>
                    )}
                  </div>
                  <BadgeBureau aUnBureau={g.aUnBureau} />
                </div>
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                <p className="text-xs text-muted-foreground">
                  {g.membres.length} membre{g.membres.length > 1 ? "s" : ""} · {g.nombreSousGroupes} sous-groupe
                  {g.nombreSousGroupes > 1 ? "s" : ""}
                </p>
                <ul className="flex flex-col gap-1">
                  {g.membres.map((m) => (
                    <li key={m.membreId} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{m.nom}</span>
                      <span className="text-xs text-muted-foreground">{libelleRole(m.role)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
                  <GroupeFormModal
                    membres={membres}
                    departements={departementOptions}
                    groupes={groupeOptions}
                    groupe={{
                      id: g.id,
                      nom: g.nom,
                      description: g.description,
                      aUnBureau: g.aUnBureau,
                      estSousGroupe: g.estSousGroupe,
                      parentId: null,
                      departementId: g.departementId,
                      responsableId: null,
                      bureauIds: [],
                    }}
                    triggerLabel="Modifier"
                  />
                  <GererMembresGroupeModal
                    groupeId={g.id}
                    nom={g.nom}
                    actuels={g.membres}
                    membres={membres}
                    departements={departementOptions}
                  />
                  <SupprimerGroupeButton groupeId={g.id} nom={g.nom} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

