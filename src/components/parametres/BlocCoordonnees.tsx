import { Users } from "lucide-react";

import type { ConfigurationEglise } from "@/lib/configuration-eglise";

export const inputCls =
  "rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

export function ErreurChamp({ message }: { message?: string[] }) {
  if (!message || message.length === 0) return null;
  return <span className="text-xs text-red-500 dark:text-red-300">{message.join(" ")}</span>;
}

type Props = {
  initiale?: Partial<ConfigurationEglise>;
  erreurs?: Record<string, string[]>;
};

/**
 * Onglet 2 — Coordonnées & Responsables : e-mail, téléphone principal,
 * pasteur principal et secrétariat.
 */
export default function BlocCoordonnees({ initiale = {}, erreurs = {} }: Props) {
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
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">E-mail de contact</span>
          <input type="email" name="emailContact" defaultValue={initiale?.emailContact} placeholder="contact@paroisse.tg" className={inputCls} />
          <ErreurChamp message={erreurs?.emailContact} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Téléphone principal</span>
          <input type="tel" name="telephone" defaultValue={initiale?.telephone} placeholder="+228 90 00 00 00" className={inputCls} />
          <ErreurChamp message={erreurs?.telephone} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Nom du Pasteur Principal</span>
          <input type="text" name="pasteurPrincipal" defaultValue={initiale?.pasteurPrincipal} maxLength={120} placeholder="Pasteur Komlan Mensah" className={inputCls} />
          <ErreurChamp message={erreurs?.pasteurPrincipal} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Secrétariat</span>
          <input type="text" name="secretariat" defaultValue={initiale?.secretariat} maxLength={150} placeholder="Nom / contact du secrétariat" className={inputCls} />
          <ErreurChamp message={erreurs?.secretariat} />
        </label>
      </div>
    </section>
  );
}
