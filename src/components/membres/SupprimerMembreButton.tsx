"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2, TriangleAlert } from "lucide-react";

import { supprimerMembre } from "@/actions/membre";
import { initialMembreFormState } from "@/types/membre";

/**
 * Bouton de suppression d'un membre.
 *
 * La suppression est demandée au serveur (`supprimerMembre`), qui vérifie les
 * droits (`exigerEcritureMembres`), l'existence du membre et ses
 * responsabilités organisationnelles. Le client impose une double
 * confirmation : une case à cocher puis la saisie du mot « SUPPRIMER ».
 */
export default function SupprimerMembreButton({
  membreId,
  nomComplet,
}: {
  membreId: string;
  nomComplet: string;
}) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(
    supprimerMembre,
    initialMembreFormState,
  );
  const [confirmation, setConfirmation] = useState("");
  const [demande, setDemande] = useState(false);

  // Après suppression, on quitte la fiche (l'ID n'existe plus).
  useEffect(() => {
    if (etat.success) router.push("/membres");
  }, [etat, router]);

  const confirmationValide = confirmation.trim().toUpperCase() === "SUPPRIMER";

  return (
    <div className="flex w-full flex-col gap-2">
      {!demande ? (
        <button
          type="button"
          onClick={() => setDemande(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Supprimer le membre
        </button>
      ) : (
        <form
          action={formAction}
          className="flex flex-col gap-2 rounded-xl border border-red-500/40 bg-red-500/5 p-3"
        >
          <p className="flex items-start gap-2 text-xs text-red-200">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Suppression définitive de « {nomComplet} ». Les écritures
              financières qui le concernent sont conservées.
            </span>
          </p>
          <input type="hidden" name="membreId" value={membreId} />
          <label htmlFor="confirmation-suppression-membre" className="text-xs text-muted-foreground">
            Tapez <span className="font-semibold text-foreground">SUPPRIMER</span> pour confirmer.
          </label>
          <input
            id="confirmation-suppression-membre"
            name="confirmation"
            type="text"
            autoComplete="off"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="SUPPRIMER"
            className="flex h-9 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
          />
          {etat.fieldErrors?.confirmation?.map((message) => (
            <p key={message} className="text-xs text-red-400">
              {message}
            </p>
          ))}
          {etat.fieldErrors?._form?.map((message) => (
            <p key={message} role="alert" className="text-xs text-red-400">
              {message}
            </p>
          ))}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={enCours || !confirmationValide}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enCours ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
              Supprimer définitivement
            </button>
            <button
              type="button"
              onClick={() => {
                setDemande(false);
                setConfirmation("");
              }}
              disabled={enCours}
              className="rounded-lg border border-card-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
