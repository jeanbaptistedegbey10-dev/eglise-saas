import { MapPin, Scale } from "lucide-react";

import type { ConfigurationEglise } from "@/lib/configuration-eglise";
import { ErreurChamp, inputCls } from "@/components/parametres/BlocCoordonnees";

type Props = {
  initiale?: Partial<ConfigurationEglise>;
  erreurs?: Record<string, string[]>;
};

/**
 * Onglet 1 — Identité & Légal : nom officiel, enregistrement/décret,
 * IFU/SIRET, RIB, adresse du siège, localisation GPS et ville.
 */
export default function BlocIdentite({ initiale = {}, erreurs = {} }: Props) {
  return (
    <section
      aria-label="Identité & légale"
      className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm sm:p-6"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Scale className="h-4 w-4 text-accent" aria-hidden />
        Identité &amp; légal
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Nom officiel de l&apos;église</span>
          <input
            type="text"
            name="nomOfficiel"
            required
            defaultValue={initiale.nomOfficiel}
            placeholder="Église Évangélique de Bè"
            className={inputCls}
          />
          <ErreurChamp message={erreurs.nomOfficiel} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-foreground">Mission / But de l&apos;assemblée</span>
          <textarea
            name="mission"
            defaultValue={initiale.mission}
            maxLength={500}
            rows={3}
            placeholder="Ex. Rassembler les croyants pour adorer Dieu et servir la communauté…"
            className={inputCls}
          />
          <ErreurChamp message={erreurs.mission} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">N° d&apos;Enregistrement / Décret</span>
          <input
            type="text"
            name="numeroEnregistrement"
            defaultValue={initiale.numeroEnregistrement}
            maxLength={80}
            placeholder="Décret n° 2020-042 / Enreg. 0451"
            className={inputCls}
          />
          <ErreurChamp message={erreurs.numeroEnregistrement} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">N° IFU / SIRET</span>
          <input
            type="text"
            name="numeroIfu"
            defaultValue={initiale.numeroIfu}
            maxLength={80}
            placeholder="IFU 1000123456"
            className={inputCls}
          />
          <ErreurChamp message={erreurs.numeroIfu} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Relevé d&apos;Identité Bancaire (RIB / IBAN)</span>
          <input
            type="text"
            name="rib"
            defaultValue={initiale.rib}
            maxLength={80}
            placeholder="TG13 0001 …"
            className={inputCls}
          />
          <ErreurChamp message={erreurs.rib} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-foreground">Adresse du siège</span>
          <input
            type="text"
            name="adresseSiege"
            defaultValue={initiale.adresseSiege}
            maxLength={250}
            placeholder="Quartier, ville (ex. Tokoin, Lomé)"
            className={inputCls}
          />
          <ErreurChamp message={erreurs.adresseSiege} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Localisation GPS</span>
          <input
            type="text"
            name="localisationGps"
            defaultValue={initiale.localisationGps}
            maxLength={80}
            placeholder="6.1319, 1.2228"
            className={inputCls}
          />
          <ErreurChamp message={erreurs.localisationGps} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Ville</span>
          <input
            type="text"
            name="ville"
            defaultValue={initiale.ville}
            maxLength={120}
            placeholder="Lomé"
            className={inputCls}
          />
          <ErreurChamp message={erreurs.ville} />
        </label>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Ces informations figurent sur les reçus, rapports et documents officiels.
      </p>
    </section>
  );
}
