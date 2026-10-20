import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import DepartementFormModal from "@/components/organisation/DepartementFormModal";
import type { MembreOptionOrganisation } from "@/types/organisation";

export const metadata: Metadata = { title: "Nouveau département", description: "Créez un département pour la sous-communauté." };
export const dynamic = "force-dynamic";

export default async function DepartementCreerPage() {
  const membreRows = await prisma.membre.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, prenoms: true, telephone: true },
  });
  const membres: MembreOptionOrganisation[] = membreRows.map((m) => ({
    id: m.id,
    nom: m.nom,
    prenoms: m.prenoms,
    telephone: m.telephone,
  }));

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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nouveau département</h1>
        </div>
      </header>

      <DepartementFormModal membres={membres} />
    </div>
  );
}
