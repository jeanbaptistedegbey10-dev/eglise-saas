import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import GroupeFormModal from "@/components/organisation/GroupeFormModal";
import type { DepartementOption, GroupeOption, MembreOptionOrganisation } from "@/types/organisation";

export const metadata: Metadata = { title: "Nouveau groupe", description: "Créez un groupe de la sous-communauté." };
export const dynamic = "force-dynamic";

export default async function GroupeCreerPage() {
  const [membreRows, grpRows, deptRows] = await Promise.all([
    prisma.membre.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, prenoms: true, telephone: true },
    }),
    prisma.groupe.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.departement.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  const membres: MembreOptionOrganisation[] = membreRows.map((m) => ({
    id: m.id,
    nom: m.nom,
    prenoms: m.prenoms,
    telephone: m.telephone,
  }));
  const groupes: GroupeOption[] = grpRows.map((g) => ({ id: g.id, nom: g.nom }));
  const departements: DepartementOption[] = deptRows.map((d) => ({ id: d.id, nom: d.nom }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex items-start gap-4">
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          href="/organisation"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Retour
        </Link>
        <div>
          <p className="text-sm font-medium text-accent">Organisation</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nouveau groupe</h1>
        </div>
      </header>

      <GroupeFormModal membres={membres} departements={departements} groupes={groupes} />
    </div>
  );
}
