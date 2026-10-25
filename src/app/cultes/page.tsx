import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import CultesClient from "@/components/cultes/CultesClient";
import { prisma } from "@/lib/prisma";
import type { CulteResume, MembreOption, StatutEvenement, StatutTache, TypeEvenement, TypeTacheResume } from "@/types/culte";
export const metadata: Metadata = { title: "Cultes & Événements", description: "Planification des événements, tâches et responsabilités." };
export const dynamic = "force-dynamic";
function versISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function moisLibelle(cle: string): string {
  const [a, m] = cle.split("-").map(Number);
  return new Date(a, (m ?? 1) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
export default async function CultesPage() {
  let cultes: CulteResume[] = [];
  let membres: MembreOption[] = [];
  let typesTache: TypeTacheResume[] = [];
  let erreurBase: string | null = null;
  try {
    const db = prisma as any;
    let lignes: any[] = [];
    try {
      lignes = await db.culte.findMany({
        orderBy: { date: "asc" },
        include: {
          responsable: true,
          taches: {
            include: {
              responsable: { select: { id: true, nom: true, prenoms: true } },
              typeTache: { select: { id: true, libelle: true, couleur: true, estParDefaut: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    } catch {
      lignes = await db.culte.findMany({ orderBy: { date: "asc" } });
    }
    cultes = lignes.map((c) => {
      const moisCle = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, "0")}`;
      const statut: StatutEvenement = c.statut ?? "PLANIFIE";
      const type: TypeEvenement = c.type ?? "OPTIONNEL";
      const responsable = c.responsable
        ? { id: c.responsable.id, nomComplet: `${c.responsable.prenoms ?? ""} ${c.responsable.nom ?? ""}`.trim() }
        : null;
      const taches = Array.isArray(c.taches)
        ? c.taches.map((t: any) => ({
            id: t.id, culteId: t.culteId ?? c.id, titre: t.titre,
            heureDebut: t.heureDebut ?? null,
            heureFin: t.heureFin ?? null,
            description: t.description ?? null,
            statut: (t.statut ?? "A_FAIRE") as StatutTache,
            responsable: t.responsable ? { id: t.responsable.id, nomComplet: `${t.responsable.prenoms ?? ""} ${t.responsable.nom ?? ""}`.trim() } : null,
            typeTache: t.typeTache ? { id: t.typeTache.id, libelle: t.typeTache.libelle, couleur: t.typeTache.couleur ?? null, estParDefaut: t.typeTache.estParDefaut } : null,
            equipe: Array.isArray(t.membresEquipe) && t.membresEquipe.length > 0
              ? t.membresEquipe.map((mid: string) => {
                  const m = membres.find((mm) => mm.id === mid);
                  return { id: mid, nomComplet: m ? m.nomComplet : mid };
                })
              : [],
          }))
        : [];
      return {
        id: c.id,
        dateISO: versISO(c.date),
        dateAffichee: formatDate(c.date),
        dateFin: c.dateFin ? versISO(c.dateFin) : null,
        heureDebut: c.heureDebut ?? null,
        heureFin: c.heureFin ?? null,
        intitule: c.intitule,
        lieu: c.lieu ?? null,
        description: c.description ?? null,
        statut,
        type,
        responsable,
        moisCle,
        moisLibelle: moisLibelle(moisCle),
        taches,
      };
    });
    const liste = await db.membre.findMany({ orderBy: [{ prenoms: "asc" }, { nom: "asc" }], select: { id: true, nom: true, prenoms: true } });
    membres = liste.map((m: any) => ({ id: m.id, nomComplet: `${m.prenoms ?? ""} ${m.nom ?? ""}`.trim() || "Membre" }));
    try {
      typesTache = await db.typeTache.findMany({
        orderBy: [{ estParDefaut: "desc" }, { libelle: "asc" }],
        select: { id: true, libelle: true, couleur: true, estParDefaut: true },
      });
    } catch {
      typesTache = [];
    }
  } catch (e) {
    console.error("Erreur chargement cultes :", e);
    erreurBase = "Impossible de joindre la base. Vérifiez DATABASE_URL puis réessayez.";
  }
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Vie de l&apos;église</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Cultes &amp; Événements</h1>
          <p className="text-sm text-muted-foreground">Planification, tâches et responsabilités — sans saisie financière.</p>
        </div>
        <div className="flex items-center gap-3">
          {!erreurBase && (<span className="rounded-full border border-card-border bg-muted px-3 py-1 text-xs text-muted-foreground">{cultes.length} événement(s)</span>)}
        </div>
      </header>
      {erreurBase ? (
        <div role="alert" className="flex gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{erreurBase}</span></div>
      ) : (
        <CultesClient cultes={cultes} membres={membres} typesTache={typesTache} />
      )}
    </div>
  );
}
