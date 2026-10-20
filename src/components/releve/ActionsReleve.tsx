"use client";

import { useState } from "react";
import { Printer, Share2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Actions de la page publique du relevé annuel :
//  • Imprimer / Télécharger le relevé (PDF) — via le dialogue d'impression
//    natif (le CSS @media print de globals.css optimise la mise en page) ;
//  • Partager le lien — Web Share API si disponible, sinon copie du lien
//    dans le presse-papiers.
// ---------------------------------------------------------------------------

type Props = {
  /** Chemin relatif du relevé (`/releve/{tokenConsultation}`). */
  urlReleve: string;
  /** Intitulé du partage (nom du membre + objet du relevé). */
  titre: string;
};

export default function ActionsReleve({ urlReleve, titre }: Props) {
  const [retour, setRetour] = useState<{ ok: boolean; message: string } | null>(null);

  function versURLComplete(): string {
    return urlReleve.startsWith("http")
      ? urlReleve
      : `${window.location.origin}${urlReleve}`;
  }

  async function copierLien(): Promise<void> {
    try {
      await navigator.clipboard.writeText(versURLComplete());
      setRetour({ ok: true, message: "Lien copié dans le presse-papiers." });
    } catch {
      setRetour({
        ok: false,
        message: "Copie impossible : sélectionnez et copiez le lien depuis la barre d'adresse.",
      });
    }
  }

  async function partagerLien(): Promise<void> {
    const url = versURLComplete();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: titre, url });
        setRetour({ ok: true, message: "Lien partagé." });
        return;
      } catch (erreur) {
        // Annulation de la partage native → repli silencieux sur le copier-coller.
        if (erreur instanceof DOMException && erreur.name === "AbortError") return;
      }
    }
    await copierLien();
  }

  return (
    <div className="no-print flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Imprimer / Télécharger le relevé (PDF)
        </button>
        <button
          type="button"
          onClick={partagerLien}
          className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Partager le lien
        </button>
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
