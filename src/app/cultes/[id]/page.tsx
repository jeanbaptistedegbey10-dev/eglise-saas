import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lireConfiguration } from "@/lib/configuration-eglise";
import CulteDetailsClient from "@/components/cultes/CulteDetailsClient";
import type { CulteResume, MembreOption, StatutEvenement, StatutTache, TypeEvenement, TypeTacheResume } from "@/types/culte";

export const dynamic = "force-dynamic";

function versISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateFr(date: Date): string {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function moisLibelle(cle: string): string {
  const [a, m] = cle.split("-").map(Number);
  return new Date(a, (m ?? 1) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default async function CulteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = prisma as any;

  let culte: any = null;
  const membreParId = new Map<string, string>();
  try {
    culte = await db.culte.findUnique({
      where: { id },
      include: {
        responsable: { select: { id: true, nom: true, prenoms: true } },
        taches: {
          include: {
            responsable: { select: { id: true, nom: true, prenoms: true } },
            typeTache: { select: { id: true, libelle: true, couleur: true, estParDefaut: true } },
          },
          orderBy: [{ dateTache: "asc" }, { heureDebut: "asc" }],
        },
      },
    });
  } catch {
    culte = null;
  }

  if (!culte) {
    notFound();
  }

  const membresRaw = await db.membre.findMany({
    select: { id: true, nom: true, prenoms: true },
    orderBy: { nom: "asc" },
  });
  const membres = membresRaw.map((m) => ({
    id: m.id,
    nom: m.nom,
    prenoms: m.prenoms,
  }));
  (membresRaw ?? []).forEach((m: any) => {
    membreParId.set(
      m.id,
      `${m.prenoms ?? ""} ${m.nom ?? ""}`.trim() || "Membre",
    );
  });
  const typesTache = await db.typeTache.findMany({
    orderBy: [{ estParDefaut: "desc" }, { libelle: "asc" }],
    select: { id: true, libelle: true, couleur: true, estParDefaut: true },
  });

  const statut: StatutEvenement = culte.statut ?? "PLANIFIE";
  const type: TypeEvenement = culte.type ?? "OPTIONNEL";
  const responsable = culte.responsable
    ? { id: culte.responsable.id, nomComplet: `${culte.responsable.prenoms ?? ""} ${culte.responsable.nom ?? ""}`.trim() }
    : null;

  const taches = Array.isArray(culte.taches)
    ? culte.taches.map((t: any) => ({
        id: t.id,
        culteId: t.culteId ?? culte.id,
        dateTache: t.dateTache ? versISO(t.dateTache) : null,
        titre: t.titre,
        heureDebut: t.heureDebut ?? null,
        heureFin: t.heureFin ?? null,
        description: t.description ?? null,
        statut: (t.statut ?? "A_FAIRE") as StatutTache,
        responsable: t.responsable
          ? { id: t.responsable.id, nomComplet: `${t.responsable.prenoms ?? ""} ${t.responsable.nom ?? ""}`.trim() }
          : null,
        typeTache: t.typeTache
          ? { id: t.typeTache.id, libelle: t.typeTache.libelle, couleur: t.typeTache.couleur ?? null, estParDefaut: t.typeTache.estParDefaut }
          : null,
        equipe: (Array.isArray(t.membresEquipe) ? t.membresEquipe : []).map(
          (id: string) => ({
            id,
            nomComplet: membreParId.get(id) ?? "Membre",
          }),
        ),
      }))
    : [];

  const culteResume: CulteResume = {
    id: culte.id,
    dateISO: versISO(culte.date),
    dateAffichee: formatDateFr(culte.date),
    dateFin: culte.dateFin ? versISO(culte.dateFin) : null,
    heureDebut: culte.heureDebut ?? null,
    heureFin: culte.heureFin ?? null,
    intitule: culte.intitule,
    lieu: culte.lieu ?? null,
    description: culte.description ?? null,
    theme: culte.theme ?? null,
    descriptionTheme: culte.descriptionTheme ?? null,
    statut,
    type,
    responsable,
    moisCle: `${culte.date.getFullYear()}-${String(culte.date.getMonth() + 1).padStart(2, "0")}`,
    moisLibelle: moisLibelle(`${culte.date.getFullYear()}-${String(culte.date.getMonth() + 1).padStart(2, "0")}`),
    taches,
  };

  const configEglise = await lireConfiguration();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Vie de l'église</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{culteResume.intitule}</h1>
          <p className="text-sm text-muted-foreground">Détail de l'événement — programme, tâches et responsabilités.</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/cultes" className="text-sm font-medium text-primary hover:underline">← Retour à la liste</a>
        </div>
      </header>
      <CulteDetailsClient
        culte={culteResume}
        membres={membres}
        typesTache={typesTache}
        configurationEglise={{
          nomOfficiel: configEglise.nomOfficiel || "Église",
          telephones: configEglise.telephones || [],
          adresseSiege: configEglise.adresseSiege || "",
          ville: configEglise.ville || "",
          emailContact: configEglise.emailContact || "",
          logoUrl: configEglise.logoUrl || null,
          mission: configEglise.mission || "",
          numeroEnregistrement: configEglise.numeroEnregistrement || "",
          ifu: configEglise.ifu || "",
          rib: configEglise.rib || "",
        }}
      />
    </div>
  );
}
