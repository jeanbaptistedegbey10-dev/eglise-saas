"use client";

// ---------------------------------------------------------------------------
// Bloc « Sauvegarde & Restauration » de la page Paramètres.
//
//  • Export  : appelle la Server Action `exporterSauvegardeJSON()` puis
//    déclenche le téléchargement du fichier `.json` via un Blob.
//  • Import  : sélection d'un fichier `.json` de sauvegarde, contrôle de
//    cohérence minimal côté client, puis restauration complète via
//    `restaurerSauvegardeJSON()` (action destructrice — confirmation
//    explicite requise).
// ---------------------------------------------------------------------------

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  CircleCheck,
  DatabaseBackup,
  Download,
  Loader2,
  ShieldAlert,
  Upload,
} from "lucide-react";

import {
  exporterSauvegardeJSON,
  restaurerSauvegardeJSON,
  type ResultatExportSauvegarde,
} from "@/actions/backup";
import { telechargerFichier } from "@/lib/csv";

type EtatAction = "idle" | "loading" | "success" | "error";

type ResumeFichier = {
  nom: string;
  taille: string;
  exporteLe: string | null;
  nomEglise: string | null;
  totalEnregistrements: number;
  donnees: unknown;
};

/** Formate une taille en octets en français (« 2,4 Mo »). */
function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1).replace(".", ",")} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

const CHAMP_BOUTON =
  "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export default function GestionSauvegardes() {
  const router = useRouter();
  const inputFichierRef = useRef<HTMLInputElement>(null);

  const [etatExport, setEtatExport] = useState<EtatAction>("idle");
  const [messageExport, setMessageExport] = useState("");

  const [etatRestauration, setEtatRestauration] = useState<EtatAction>("idle");
  const [messageRestauration, setMessageRestauration] = useState("");
  const [resumeFichier, setResumeFichier] = useState<ResumeFichier | null>(null);
  const [confirmationDonnee, setConfirmationDonnee] = useState(false);


  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------
  const handleExport = async () => {
    setEtatExport("loading");
    setMessageExport("Génération de la sauvegarde en cours…");
    try {
      const resultat: ResultatExportSauvegarde = await exporterSauvegardeJSON();
      if (resultat.ok && resultat.contenu && resultat.nomFichier) {
        telechargerFichier(resultat.nomFichier, resultat.contenu, "application/json");
        setEtatExport("success");
        setMessageExport(resultat.message);
      } else {
        setEtatExport("error");
        setMessageExport(resultat.message);
      }
    } catch (erreur: any) {
      setEtatExport("error");
      setMessageExport(erreur?.message ?? "Erreur inattendue lors de l'export.");
    }
  };

  // -------------------------------------------------------------------------
  // Sélection du fichier de restauration
  // -------------------------------------------------------------------------
  const handleFichier = async (fichier: File | undefined) => {
    setEtatRestauration("idle");
    setMessageRestauration("");
    setConfirmationDonnee(false);
    setResumeFichier(null);
    if (!fichier) return;

    try {
      const texte = await fichier.text();
      const parsed = JSON.parse(texte) as {
        meta?: { exporteLe?: unknown; nomEglise?: unknown };
        donnees?: Record<string, unknown[]>;
      };
      if (typeof parsed !== "object" || parsed === null || typeof parsed.donnees !== "object") {
        throw new Error("Fichier invalide : ce n'est pas une sauvegarde Église SaaS.");
      }
      const total = Object.values(parsed.donnees ?? {}).reduce(
        (somme, table) => somme + (Array.isArray(table) ? table.length : 0),
        0,
      );
      setResumeFichier({
        nom: fichier.name,
        taille: formaterTaille(fichier.size),
        exporteLe: typeof parsed.meta?.exporteLe === "string" ? parsed.meta.exporteLe : null,
        nomEglise: typeof parsed.meta?.nomEglise === "string" ? parsed.meta.nomEglise : null,
        totalEnregistrements: total,
        donnees: parsed,
      });
    } catch (erreur: any) {
      setEtatRestauration("error");
      setMessageRestauration(
        erreur?.message ?? "Impossible de lire ce fichier JSON de sauvegarde.",
      );
    }
  };

  // -------------------------------------------------------------------------
  // Restauration (destructrice)
  // -------------------------------------------------------------------------
  const handleRestauration = async () => {
    if (!resumeFichier) return;
    setEtatRestauration("loading");
    setMessageRestauration("Restauration en cours — ne fermez pas cette page…");
    try {
      const resultat = await restaurerSauvegardeJSON(resumeFichier.donnees);
      if (resultat.ok) {
        setEtatRestauration("success");
        setMessageRestauration(resultat.message);
        setResumeFichier(null);
        setConfirmationDonnee(false);
        if (inputFichierRef.current) inputFichierRef.current.value = "";
        router.refresh();
      } else {
        setEtatRestauration("error");
        setMessageRestauration(resultat.message);
      }
    } catch (erreur: any) {
      setEtatRestauration("error");
      setMessageRestauration(erreur?.message ?? "Erreur inattendue lors de la restauration.");
    }
  };

  const badge = (statut: EtatAction) => {
    switch (statut) {
      case "loading":
        return "text-indigo-600 dark:text-indigo-300 animate-pulse";
      case "success":
        return "text-emerald-600 dark:text-emerald-300";
      case "error":
        return "text-rose-600 dark:text-rose-300";
      default:
        return "text-slate-500";
    }
  };

  return (
    <section
      aria-label="Sauvegarde et restauration"
      className="mt-8 rounded-2xl border border-card-border bg-card p-6 text-card-foreground"
    >
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <DatabaseBackup className="h-5 w-5 text-muted-foreground" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Sauvegarde &amp; Restauration</h2>
          <p className="text-sm text-muted-foreground">
            Exportez l&apos;intégralité de la base (membres, caisses, cotisations, cultes,
            patrimoine, audit) en JSON, ou restaurez-la depuis un fichier de sauvegarde.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ------------------------- EXPORT ------------------------- */}
        <div className="rounded-xl border border-card-border bg-muted/40 p-5">
          <h3 className="mb-2 flex items-center gap-2 font-medium">
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Exporter une sauvegarde
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Télécharge un fichier <code className="rounded bg-muted px-1">.json</code> complet,
            horodaté, conservable hors ligne.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={etatExport === "loading"}
            className={`${CHAMP_BOUTON} border border-emerald-500/40 bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            {etatExport === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            {etatExport === "loading" ? "Génération…" : "Télécharger la sauvegarde (JSON)"}
          </button>
          {messageExport && (
            <p className={`mt-3 text-sm font-medium ${badge(etatExport)}`} role="status">
              {messageExport}
            </p>
          )}
        </div>


        {/* ------------------------- IMPORT ------------------------- */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
          <h3 className="mb-2 flex items-center gap-2 font-medium">
            <Upload className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden />
            Restaurer depuis un fichier
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            ⚠️ La restauration <strong>remplace toutes les données actuelles</strong> par le
            contenu du fichier (opération réversible uniquement par une autre sauvegarde).
          </p>

          <input
            ref={inputFichierRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => handleFichier(e.target.files?.[0])}
            disabled={etatRestauration === "loading"}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80"
          />

          {resumeFichier && (
            <div className="mt-4 space-y-3 rounded-lg border border-card-border bg-background p-4">
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="font-medium text-foreground">{resumeFichier.nom}</span>
                <span className="text-muted-foreground">
                  Taille : {resumeFichier.taille}
                  {resumeFichier.nomEglise ? ` · ${resumeFichier.nomEglise}` : ""}
                </span>
                {resumeFichier.exporteLe && (
                  <span className="text-muted-foreground">
                    Exporté le{" "}
                    {new Date(resumeFichier.exporteLe).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {resumeFichier.totalEnregistrements} enregistrement
                  {resumeFichier.totalEnregistrements > 1 ? "s" : ""} à restaurer
                </span>
              </div>

              <label className="flex items-start gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={confirmationDonnee}
                  onChange={(e) => setConfirmationDonnee(e.target.checked)}
                  disabled={etatRestauration === "loading"}
                  className="mt-0.5 h-4 w-4 rounded border-card-border"
                />
                <span>
                  Je confirme que les données actuelles seront <strong>remplacées</strong> par
                  celles de ce fichier.
                </span>
              </label>

              <button
                type="button"
                onClick={handleRestauration}
                disabled={!confirmationDonnee || etatRestauration === "loading"}
                className={`${CHAMP_BOUTON} w-full justify-center border border-rose-500/40 bg-rose-600 text-white hover:bg-rose-700`}
              >
                {etatRestauration === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ShieldAlert className="h-4 w-4" aria-hidden />
                )}
                {etatRestauration === "loading"
                  ? "Restauration…"
                  : "Restaurer la base depuis ce fichier"}
              </button>
            </div>
          )}

          {messageRestauration && (
            <p className={`mt-3 text-sm font-medium ${badge(etatRestauration)}`} role="status">
              {etatRestauration === "error" && (
                <CircleAlert className="mr-1 inline h-4 w-4" aria-hidden />
              )}
              {etatRestauration === "success" && (
                <CircleCheck className="mr-1 inline h-4 w-4" aria-hidden />
              )}
              {messageRestauration}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Les opérations de sauvegarde et de restauration sont réservées aux administrateurs et
        sont tracées dans le journal d&apos;audit. Votre session administrateur est toujours
        préservée lors d&apos;une restauration.
      </p>
    </section>
  );
}
