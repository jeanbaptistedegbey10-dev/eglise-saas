"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Check,
  CircleAlert,
  ClipboardCheck,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { changerEtatBien, enregistrerBien, supprimerBien } from "@/actions/patrimoine";
import { formatMontant } from "@/lib/membre";

/** Ligne d'inventaire transmise par le serveur (dates sérialisées par RSC). */
export interface BienPatrimoineUI {
  id: string;
  designation: string;
  categorie: string;
  quantite: number;
  etat: string;
  valeurEstimee: number | null;
  lieuStockage: string | null;
  dateAcquisition: Date | string | null;
  remarques: string | null;
  createdAt: Date | string;
}

export interface PatrimoineStats {
  /** Somme des quantités inventoriées. */
  totalArticles: number;
  /** Valeur estimée cumulée du parc (FCFA). */
  valeurTotale: number;
  /** Biens en panne ou hors service. */
  nbEnPanne: number;
}

const INPUT =
  "flex w-full rounded-lg border border-card-border bg-background px-3 h-10 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

const CATEGORIES = ["SONORISATION", "INSTRUMENT", "MOBILIER", "INFORMATIQUE", "IMMOBILIER", "AUTRE"] as const;
const ETATS = ["NEUF", "BON_ETAT", "USAGE", "EN_PANNE", "HORS_SERVICE"] as const;

const LIBELLES_CATEGORIE: Record<string, string> = {
  SONORISATION: "Sonorisation",
  INSTRUMENT: "Instrument",
  MOBILIER: "Mobilier",
  INFORMATIQUE: "Informatique",
  IMMOBILIER: "Immobilier",
  AUTRE: "Autre",
};

const LIBELLES_ETAT: Record<string, string> = {
  NEUF: "Neuf",
  BON_ETAT: "Bon état",
  USAGE: "Usagé",
  EN_PANNE: "En panne",
  HORS_SERVICE: "Hors service",
};

const BADGES_ETAT: Record<string, string> = {
  NEUF: "bg-emerald-500/15 text-emerald-400",
  BON_ETAT: "bg-primary/15 text-accent",
  USAGE: "bg-amber-500/15 text-amber-300",
  EN_PANNE: "bg-red-500/15 text-red-400",
  HORS_SERVICE: "bg-muted text-muted-foreground",
};

interface FormulaireBien {
  designation: string;
  categorie: string;
  quantite: string;
  etat: string;
  valeurEstimee: string;
  lieuStockage: string;
  dateAcquisition: string;
  remarques: string;
}

const FORMULAIRE_VIDE: FormulaireBien = {
  designation: "",
  categorie: "MOBILIER",
  quantite: "1",
  etat: "BON_ETAT",
  valeurEstimee: "",
  lieuStockage: "",
  dateAcquisition: "",
  remarques: "",
};

/** Convertit une date (Date ou chaîne ISO sérialisée par RSC) en valeur `input[type=date]`. */
function versChampDate(valeur: Date | string | null): string {
  if (!valeur) return "";
  const date = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

type MenuAction = { id: string; x: number; y: number };

/** Points de suspension du menu d'actions (SVG local, évite une dépendance à un alias d'icône). */
function MoreHorizontalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PatrimoineClient({ biens, stats }: { biens: BienPatrimoineUI[]; stats: PatrimoineStats }) {
  const router = useRouter();
  const [motCle, setMotCle] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState("");
  const [etatFiltre, setEtatFiltre] = useState("");
  const [modalOuverte, setModalOuverte] = useState(false);
  const [bienEdite, setBienEdite] = useState<BienPatrimoineUI | null>(null);
  const [form, setForm] = useState<FormulaireBien>(FORMULAIRE_VIDE);
  const [erreurs, setErreurs] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<{ texte: string; type: "success" | "error" } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuAction | null>(null);

  const biensFiltres = useMemo(() => {
    const q = motCle.trim().toLowerCase();
    return biens.filter((bien) => {
      const correspond =
        !q ||
        bien.designation.toLowerCase().includes(q) ||
        (bien.lieuStockage ?? "").toLowerCase().includes(q) ||
        (bien.remarques ?? "").toLowerCase().includes(q) ||
        (LIBELLES_CATEGORIE[bien.categorie] ?? bien.categorie).toLowerCase().includes(q);
      const memeCategorie = !categorieFiltre || bien.categorie === categorieFiltre;
      const memeEtat = !etatFiltre || bien.etat === etatFiltre;
      return correspond && memeCategorie && memeEtat;
    });
  }, [biens, motCle, categorieFiltre, etatFiltre]);

  useEffect(() => {
    if (!modalOuverte) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOuverte(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modalOuverte]);

  const informer = (texte: string, type: "success" | "error") => {
    setMessage({ texte, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const ouvrirCreation = () => {
    setBienEdite(null);
    setForm(FORMULAIRE_VIDE);
    setErreurs({});
    setModalOuverte(true);
  };

  const ouvrirModification = (bien: BienPatrimoineUI) => {
    setBienEdite(bien);
    setForm({
      designation: bien.designation,
      categorie: bien.categorie,
      quantite: String(bien.quantite),
      etat: bien.etat,
      valeurEstimee: bien.valeurEstimee === null ? "" : String(bien.valeurEstimee),
      lieuStockage: bien.lieuStockage ?? "",
      dateAcquisition: versChampDate(bien.dateAcquisition),
      remarques: bien.remarques ?? "",
    });
    setErreurs({});
    setModalOuverte(true);
  };
  const soumettreBien = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnvoi(true);
    setErreurs({});
    try {
      const resultat = await enregistrerBien({
        id: bienEdite?.id,
        designation: form.designation,
        categorie: form.categorie,
        quantite: Number(form.quantite),
        etat: form.etat,
        valeurEstimee: form.valeurEstimee === "" ? null : Number(form.valeurEstimee),
        lieuStockage: form.lieuStockage.trim() || null,
        dateAcquisition: form.dateAcquisition ? new Date(form.dateAcquisition).toISOString() : null,
        remarques: form.remarques.trim() || null,
      });
      if (resultat.success) {
        setModalOuverte(false);
        setBienEdite(null);
        informer(resultat.message, "success");
        router.refresh();
      } else {
        setErreurs(resultat.fieldErrors);
        informer(resultat.message, "error");
      }
    } catch {
      informer("Une erreur est survenue lors de l'enregistrement.", "error");
    } finally {
      setEnvoi(false);
    }
  };

  const gererSuppression = async (id: string, designation: string) => {
    if (!window.confirm(`Confirmer la suppression du bien « ${designation} » ?`)) return;
    setActionEnCours(id);
    try {
      const resultat = await supprimerBien(id);
      if (resultat.success) {
        informer(resultat.message, "success");
        router.refresh();
      } else {
        informer(resultat.message, "error");
      }
    } catch {
      informer("Une erreur est survenue lors de la suppression.", "error");
    } finally {
      setActionEnCours(null);
    }
  };

  const gererChangementEtat = async (id: string, nouvelEtat: string, designation: string) => {
    setActionEnCours(id);
    try {
      const resultat = await changerEtatBien(id, nouvelEtat);
      if (resultat.success) {
        informer(resultat.message, "success");
        router.refresh();
      } else {
        informer(resultat.message, "error");
      }
    } catch {
      informer(`Une erreur est survenue lors du changement d'état de « ${designation} ».`, "error");
    } finally {
      setActionEnCours(null);
    }
  };

  const ouvrirMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu(menu?.id === id ? null : { id, x: rect.right, y: rect.bottom + 4 });
  };

  const erreurChamp = (champ: string) => erreurs[champ]?.[0];

  return (
    <div className="space-y-6">
      {message && (
        <div
          role="alert"
          className={clsx(
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
            message.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300",
          )}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {message.texte}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-xl font-bold">Patrimoine &amp; Logistique</h1>
          <p className="text-sm text-muted-foreground">
            Inventaire du matériel de l&apos;église : sonorisation, instruments, mobilier, informatique, immobilier.
          </p>
        </div>
        <button
          type="button"
          onClick={ouvrirCreation}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:ml-auto"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Ajouter un bien matériel
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">Articles inventoriés</p>
              <p className="text-lg font-semibold text-foreground">{formatMontant(stats.totalArticles)}</p>
              <p className="text-[10px] text-muted-foreground">Somme des quantités</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">Valeur estimée totale</p>
              <p className="text-lg font-semibold text-foreground">{formatMontant(stats.valeurTotale)} FCFA</p>
              <p className="text-[10px] text-muted-foreground">Parc matériel estimé</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CircleAlert className="h-5 w-5 text-red-500" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">En panne / hors service</p>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatMontant(stats.nbEnPanne)}</p>
              <p className="text-[10px] text-muted-foreground">Équipements à réparer ou remplacer</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:max-w-sm md:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={motCle}
            onChange={(e) => setMotCle(e.target.value)}
            placeholder="Rechercher par désignation, lieu, remarque…"
            aria-label="Rechercher un bien"
            className="h-10 w-full rounded-xl border border-card-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categorieFiltre}
            onChange={(e) => setCategorieFiltre(e.target.value)}
            aria-label="Filtrer par catégorie"
            className={clsx(INPUT, "w-auto min-w-40")}
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {LIBELLES_CATEGORIE[cat]}
              </option>
            ))}
          </select>
          <select
            value={etatFiltre}
            onChange={(e) => setEtatFiltre(e.target.value)}
            aria-label="Filtrer par état"
            className={clsx(INPUT, "w-auto min-w-36")}
          >
            <option value="">Tous les états</option>
            {ETATS.map((etat) => (
              <option key={etat} value={etat}>
                {LIBELLES_ETAT[etat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Désignation</th>
              <th className="px-5 py-3 font-medium">Catégorie</th>
              <th className="px-5 py-3 text-right font-medium">Quantité</th>
              <th className="px-5 py-3 font-medium">État</th>
              <th className="px-5 py-3 text-right font-medium">Valeur estimée</th>
              <th className="px-5 py-3 font-medium">Lieu de stockage</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {biensFiltres.map((bien) => (
              <tr key={bien.id} className="transition-colors hover:bg-muted/40">
                <td className="px-5 py-3 font-medium text-foreground">
                  {bien.designation}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {bien.remarques ? bien.remarques : ""}
                    {bien.remarques && versChampDate(bien.dateAcquisition) ? " · " : ""}
                    {versChampDate(bien.dateAcquisition)
                      ? `Acquis le ${new Date(versChampDate(bien.dateAcquisition)).toLocaleDateString("fr-FR")}`
                      : ""}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                  {LIBELLES_CATEGORIE[bien.categorie] ?? bien.categorie}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-foreground">
                  {formatMontant(bien.quantite)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={clsx(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                      BADGES_ETAT[bien.etat] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {LIBELLES_ETAT[bien.etat] ?? bien.etat}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-foreground">
                  {bien.valeurEstimee === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    `${formatMontant(bien.valeurEstimee)} FCFA`
                  )}
                </td>
                <td className="px-5 py-3 text-muted-foreground">{bien.lieuStockage || "—"}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => ouvrirMenu(bien.id, e)}
                    disabled={actionEnCours === bien.id}
                    aria-label={`Actions rapides pour ${bien.designation}`}
                    aria-haspopup="menu"
                    className="inline-flex items-center rounded-lg border border-card-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
                  >
                    {actionEnCours === bien.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <MoreHorizontalIcon />
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {biensFiltres.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {biens.length === 0
                    ? "Aucun bien inventorié pour le moment. Ajoutez votre premier matériel."
                    : "Aucun bien ne correspond aux filtres appliqués."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {menu && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer le menu"
            onClick={() => setMenu(null)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="fixed z-50 w-52 overflow-hidden rounded-xl border border-card-border bg-card shadow-xl"
            style={{ top: menu.y, left: menu.x - 208 }}
          >
            {(() => {
              const bien = biens.find((b) => b.id === menu.id);
              if (!bien) return null;
              return (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(null);
                      ouvrirModification(bien);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Modifier
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={bien.etat === "EN_PANNE" || bien.etat === "HORS_SERVICE"}
                    onClick={() => {
                      setMenu(null);
                      gererChangementEtat(bien.id, "EN_PANNE", bien.designation);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CircleAlert className="h-4 w-4 text-amber-500" aria-hidden />
                    Déclarer en panne
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(null);
                      gererSuppression(bien.id, bien.designation);
                    }}
                    className="flex w-full items-center gap-2 border-t border-card-border px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Supprimer
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}
      {modalOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer"
            onClick={() => setModalOuverte(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Patrimoine</p>
                <h2 className="text-lg font-semibold text-foreground">
                  {bienEdite ? "Modifier le bien" : "Enregistrer un bien matériel"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOuverte(false)}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <form onSubmit={soumettreBien} className="flex flex-col gap-4 px-6 py-5">
              {erreurChamp("_form") && (
                <div
                  role="alert"
                  className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{erreurChamp("_form")}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="bien-designation" className="text-sm font-medium text-foreground">
                  Désignation*
                </label>
                <input
                  id="bien-designation"
                  type="text"
                  maxLength={120}
                  required
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  placeholder="Ex. Micro sans fil Shure SM58"
                  className={clsx(INPUT, erreurChamp("designation") && "border-red-500/70")}
                />
                {erreurChamp("designation") && <p className="text-xs text-red-500">{erreurChamp("designation")}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bien-categorie" className="text-sm font-medium text-foreground">
                    Catégorie
                  </label>
                  <select
                    id="bien-categorie"
                    value={form.categorie}
                    onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                    className={clsx(INPUT, erreurChamp("categorie") && "border-red-500/70")}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {LIBELLES_CATEGORIE[cat]}
                      </option>
                    ))}
                  </select>
                  {erreurChamp("categorie") && <p className="text-xs text-red-500">{erreurChamp("categorie")}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bien-quantite" className="text-sm font-medium text-foreground">
                    Quantité*
                  </label>
                  <input
                    id="bien-quantite"
                    type="number"
                    min={1}
                    max={100000}
                    required
                    value={form.quantite}
                    onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                    className={clsx(INPUT, erreurChamp("quantite") && "border-red-500/70")}
                  />
                  {erreurChamp("quantite") && <p className="text-xs text-red-500">{erreurChamp("quantite")}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bien-etat" className="text-sm font-medium text-foreground">
                    État
                  </label>
                  <select
                    id="bien-etat"
                    value={form.etat}
                    onChange={(e) => setForm({ ...form, etat: e.target.value })}
                    className={clsx(INPUT, erreurChamp("etat") && "border-red-500/70")}
                  >
                    {ETATS.map((etat) => (
                      <option key={etat} value={etat}>
                        {LIBELLES_ETAT[etat]}
                      </option>
                    ))}
                  </select>
                  {erreurChamp("etat") && <p className="text-xs text-red-500">{erreurChamp("etat")}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bien-valeur" className="text-sm font-medium text-foreground">
                    Valeur estimée (FCFA)
                  </label>
                  <input
                    id="bien-valeur"
                    type="number"
                    min={0}
                    step="any"
                    value={form.valeurEstimee}
                    onChange={(e) => setForm({ ...form, valeurEstimee: e.target.value })}
                    placeholder="Ex. 150000"
                    className={clsx(INPUT, erreurChamp("valeurEstimee") && "border-red-500/70")}
                  />
                  {erreurChamp("valeurEstimee") && <p className="text-xs text-red-500">{erreurChamp("valeurEstimee")}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bien-lieu" className="text-sm font-medium text-foreground">
                    Lieu de stockage
                  </label>
                  <input
                    id="bien-lieu"
                    type="text"
                    maxLength={120}
                    value={form.lieuStockage}
                    onChange={(e) => setForm({ ...form, lieuStockage: e.target.value })}
                    placeholder="Ex. Temple principal, Magasin…"
                    className={clsx(INPUT, erreurChamp("lieuStockage") && "border-red-500/70")}
                  />
                  {erreurChamp("lieuStockage") && <p className="text-xs text-red-500">{erreurChamp("lieuStockage")}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bien-date" className="text-sm font-medium text-foreground">
                    Date d&apos;acquisition
                  </label>
                  <input
                    id="bien-date"
                    type="date"
                    value={form.dateAcquisition}
                    onChange={(e) => setForm({ ...form, dateAcquisition: e.target.value })}
                    className={clsx(INPUT, erreurChamp("dateAcquisition") && "border-red-500/70")}
                  />
                  {erreurChamp("dateAcquisition") && (
                    <p className="text-xs text-red-500">{erreurChamp("dateAcquisition")}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bien-remarques" className="text-sm font-medium text-foreground">
                  Remarques
                </label>
                <textarea
                  id="bien-remarques"
                  rows={3}
                  maxLength={500}
                  value={form.remarques}
                  onChange={(e) => setForm({ ...form, remarques: e.target.value })}
                  placeholder="Suivi, accessoires fournis, réserves…"
                  className="flex w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                />
                {erreurChamp("remarques") && <p className="text-xs text-red-500">{erreurChamp("remarques")}</p>}
              </div>

              <div className="-mx-6 -mb-5 flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setModalOuverte(false)}
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={envoi}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {envoi ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  {envoi ? "…" : bienEdite ? "Mettre à jour" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
