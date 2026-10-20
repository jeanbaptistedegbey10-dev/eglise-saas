"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ClipboardCopy, ExternalLink, LoaderCircle } from "lucide-react";

import { obtenirLienReleveMembre } from "@/actions/cotisation";

// ---------------------------------------------------------------------------
// Actions du relevé annuel sur la fiche membre :
//  • « Copier le lien du relevé annuel » — résout le lien via le Server Action
//    puis le copie dans le presse-papiers ;
//  • « Consulter le bilan annuel » — ouvre la page publique /releve/[token]
//    dans un nouvel onglet.
// ---------------------------------------------------------------------------

type Props = {
  membreId: string;
  /** Chemin relatif du relevé (`/releve/{tokenConsultation}`). */
  urlReleve: string;
};

export default function ActionsLienReleve({ membreId, urlReleve }: Props) {
  const [enCours, startTransition] = useTransition();
  const [retour, setRetour] = useState<{ ok: boolean; message: string } | null>(null);

  function copierLien(): void {
    setRetour(null);
    startTransition(async () => {
      const resultat = await obtenirLienReleveMembre(membreId);
      if (!resultat.success || !resultat.url) {
        setRetour({ ok: false, message: resultat.message });
        return;
      }
      const urlComplete =
        resultat.urlAbsolu ?? `${window.location.origin}${resultat.url}`;
      try {
        await navigator.clipboard.writeText(urlComplete);
        setRetour({
          ok: true,
          message: "Lien du relevé annuel copié dans le presse-papiers.",
        });
      } catch {
        setRetour({
          ok: false,
          message: `Copie automatique impossible — lien : ${urlComplete}`,
        });
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copierLien}
          disabled={enCours}
          className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          {enCours ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ClipboardCopy className="h-4 w-4" aria-hidden />
          )}
          Copier le lien du relevé annuel
        </button>
        <Link
          href={urlReleve}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Consulter le bilan annuel
        </Link>
      </div>
      {retour && (
        <p
          role="status"
          className={
            retour.ok
              ? "text-xs text-emerald-600 dark:text-emerald-300"
              : "text-xs text-red-600 dark:text-red-300"
          }
        >
          {retour.message}
        </p>
      )}
    </div>
  );
}
