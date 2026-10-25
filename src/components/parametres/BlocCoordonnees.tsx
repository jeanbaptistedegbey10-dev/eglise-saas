import { useState } from "react";
import { Users, Minus, Plus } from "lucide-react";

import type { ConfigurationEglise } from "@/lib/configuration-eglise";

export const inputCls =
  "rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

const buttonCls =
  "rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent/10";

export function ErreurChamp({ message }: { message?: string[] }) {
  if (!message || message.length === 0) return null;
  return <span className="text-xs text-red-500 dark:text-red-300">{message.join(" ")}</span>;
}

type Props = {
  initiale?: Partial<ConfigurationEglise>;
  erreurs?: Record<string, string[]>;
};

/**
 * Onglet 2 — Coordonnées & Responsables : adresse complète du siège,
 * numéros de téléphone (1 à 4), e-mail de contact, pasteur principal et
 * secrétariat.
 */

const NB_TELEPHONES_MIN = 1;
const NB_TELEPHONES_MAX = 4;

export default function BlocCoordonnees({ initiale = {}, erreurs = {} }: Props) {
  const [telephones, setTelephones] = useState<string[]>(() => {
    const initiaux = initiale?.telephones?.filter((t) => t.trim() !== "") ?? [];
    return initiaux.length > 0 ? initiaux : [""];
  });

  const ajouterTelephone = () => {
    if (telephones.length < NB_TELEPHONES_MAX) {
      setTelephones([...telephones, ""]);
    }
  };

  const supprimerTelephone = (index: number) => {
    if (telephones.length > NB_TELEPHONES_MIN) {
      setTelephones(telephones.filter((_, i) => i !== index));
    }
  };

  const modifierTelephone = (index: number, valeur: string) => {
    const suivante = [...telephones];
    suivante[index] = valeur;
    setTelephones(suivante);
  };

  return (
    <section
      aria-label="Coordonnées & responsables"
      className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm sm:p-6"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Users className="h-4 w-4 text-accent" aria-hidden />
        Coordonnées &amp; responsables
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Adresse complète du siège — pleine largeur */}
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-foreground">Adresse complète du siège</span>
          <input
            type="text"
            name="adresseSiege"
            defaultValue={initiale?.adresseSiege ?? ""}
            maxLength={250}
            placeholder="Quartier, avenue, rue, ville (ex. Adidogomé, Lomé, TOGO)"
            className={inputCls}
          />
          <ErreurChamp message={erreurs?.adresseSiege} />
        </label>
        {/* E-mail officiel */}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">E-mail de contact</span>
          <input
            type="email"
            name="emailContact"
            defaultValue={initiale?.emailContact ?? ""}
            placeholder="contact@paroisse.tg"
            className={inputCls}
          />
          <ErreurChamp message={erreurs?.emailContact} />
        </label>
        {/* Numéros de téléphone (1 à 4) */}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-medium text-foreground">
            Numéros de téléphone ({telephones.length} / {NB_TELEPHONES_MAX})
          </span>
          {telephones.map((numero, index) => (
            <div key={index} className="flex items-end gap-2">
              <input
                type="tel"
                name={`telephone_${index}`}
                value={numero}
                onChange={(e) => modifierTelephone(index, e.target.value)}
                placeholder={`+228 90 00 00 00`}
                maxLength={30}
                className={inputCls}
              />
              {telephones.length > NB_TELEPHONES_MIN && (
                <button
                  type="button"
                  onClick={() => supprimerTelephone(index)}
                  aria-label={`Supprimer le téléphone ${index + 1}`}
                  disabled={telephones.length <= NB_TELEPHONES_MIN}
                  className={buttonCls}
                >
                  <Minus className="h-3 w-3" aria-hidden />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={ajouterTelephone}
            disabled={telephones.length >= NB_TELEPHONES_MAX}
            className={`${buttonCls} flex items-center gap-1.5`}
          >
            <Plus className="h-3 w-3" aria-hidden />
            Ajouter un téléphone
          </button>
          <ErreurChamp message={erreurs?.telephones} />
        </div>
        {/* Pasteur principal */}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Nom du Pasteur Principal</span>
          <input
            type="text"
            name="pasteurPrincipal"
            defaultValue={initiale?.pasteurPrincipal ?? ""}
            maxLength={120}
            placeholder="Pasteur Komlan Mensah"
            className={inputCls}
          />
          <ErreurChamp message={erreurs?.pasteurPrincipal} />
        </label>
        {/* Secrétariat */}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Secrétariat</span>
          <input
            type="text"
            name="secretariat"
            defaultValue={initiale?.secretariat ?? ""}
            maxLength={150}
            placeholder="Nom / contact du secrétariat"
            className={inputCls}
          />
          <ErreurChamp message={erreurs?.secretariat} />
        </label>
      </div>
    </section>
  );
}
