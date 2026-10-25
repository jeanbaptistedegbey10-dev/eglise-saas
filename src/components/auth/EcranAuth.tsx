import { Church, Quote } from "lucide-react";
import { lireConfiguration } from "@/lib/configuration-eglise";

// ---------------------------------------------------------------------------
// Mise en page « split-screen » des écrans d'authentification.
// Colonne gauche : marque, accueil, punchline et cartes de fonctionnalités.
// Colonne droite : fond clair, formulaire épuré.
// ---------------------------------------------------------------------------

type Props = {
  /** Titre affiché au-dessus du formulaire (colonne droite). */
  titre: string;
  /** Court paragraphe sous le titre. */
  sousTitre: string;
  /** Formulaire ou contenu de la colonne droite. */
  children: React.ReactNode;
  /** Thème visuel de la colonne gauche : "violet" (défaut) ou "sky-orange". */
  theme?: "violet" | "sky-orange";
};


export default async function EcranAuth({ 
  titre, 
  sousTitre, 
  children, 
  theme = "violet" 
}: Props) {
  const isSky = theme === "sky-orange";
  const config = await lireConfiguration();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Colonne gauche */}
      <aside className={`
        relative overflow-hidden px-8 py-12 text-white lg:flex lg:flex-col lg:items-center lg:justify-center lg:text-center xl:px-12
        ${isSky
          ? "bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700"
          : "hidden bg-gradient-to-br from-[#0b1233] via-[#151f56] to-[#1e1b4b] lg:flex lg:justify-between xl:px-16"
      }`}>
        {isSky ? (
          <>
            {/* Marque */}
            <div className="relative flex items-center justify-center gap-3 mb-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/30">
                <Church className="h-6 w-6 text-white" aria-hidden />
              </span>
              <span className="text-left">
                <span className="block text-xl font-bold tracking-tight text-white">
                  Église SaaS
                </span>
                <span className="block text-sm text-sky-100/90">
                  Gestion communautaire &amp; financière
                </span>
              </span>
            </div>

            {/* Accueil + punchline centrée */}
            <div className="relative max-w-lg">
              <h1 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl mb-6">
                Bienvenue sur Église SaaS
              </h1>
              <p className="text-lg leading-relaxed text-sky-100 mb-10 xl:text-xl">
                La plateforme qui simplifie la gestion de votre communauté
                chrétienne au Togo. Dons, cotisations, membres et secrétariat
                en un seul endroit.
              </p>

              {/* Informations de l'église */}
              <div className="mt-8 w-full max-w-md space-y-3 text-center">
                {config.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt={config.nomOfficiel}
                    className="mx-auto h-16 w-16 rounded-full object-cover bg-white/20"
                  />
                ) : (
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <Church className="h-8 w-8 text-white" aria-hidden />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-white">
                  {config.nomOfficiel || "Église"}
                </h2>
                {config.mission && (
                  <p className="mt-2 text-lg text-white/90 max-w-md leading-relaxed">
                    {config.mission}
                  </p>
                )}
                <div className="mt-6 w-full space-y-2 text-sm text-white/90">
                  {config.adresseSiege && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-white/70">Adresse :</span>
                      <span>{config.adresseSiege}</span>
                    </div>
                  )}
                  {config.ville && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-white/70">Ville :</span>
                      <span>{config.ville}</span>
                    </div>
                  )}
                  {config.emailContact && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-white/70">Contact :</span>
                      <span>{config.emailContact}</span>
                    </div>
                  )}
                  {config.telephones?.length && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-white/70">Tél :</span>
                      <span>{config.telephones.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Halos décoratifs */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-indigo-500/20 blur-3xl"
            />

        {/* Marque */}
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Church className="h-6 w-6 text-violet-200" aria-hidden />
          </span>
          <span>
            <span className="block text-base font-semibold tracking-tight">
              Église SaaS
            </span>
            <span className="block text-xs text-white/60">
              Gestion communautaire &amp; financière
            </span>
          </span>
        </div>

        {/* Accueil + punchline */}
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Bienvenue sur Église SaaS
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70 xl:text-lg">
            La plateforme qui simplifie la gestion de votre communauté
            chrétienne.
          </p>
          {/* Informations de l'église */}
          <div className="mt-8 w-full max-w-md space-y-3 text-left text-white/90">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.nomOfficiel}
                className="h-12 w-12 rounded-full object-cover bg-white/20 shrink-0"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 shrink-0">
                <Church className="h-6 w-6 text-white" aria-hidden />
              </div>
            )}
            <h2 className="text-xl font-bold text-white">
              {config.nomOfficiel || "Église"}
            </h2>
            {config.mission && (
              <p className="mt-2 text-base text-white/90 leading-relaxed">
                {config.mission}
              </p>
            )}
            <div className="mt-4 w-full space-y-2 text-sm">
              {config.adresseSiege && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-white/70">Adresse :</span>
                  <span>{config.adresseSiege}</span>
                </div>
              )}
              {config.ville && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-white/70">Ville :</span>
                  <span>{config.ville}</span>
                </div>
              )}
              {config.emailContact && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-white/70">Contact :</span>
                  <span>{config.emailContact}</span>
                </div>
              )}
              {config.telephones?.length && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-white/70">Tél :</span>
                  <span>{config.telephones.join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Carte de témoignage / assurance */}
        <figure className="relative max-w-md rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <Quote className="h-5 w-5 text-violet-300" aria-hidden />
          <blockquote className="mt-3 text-sm leading-relaxed text-white/85">
            « Depuis que nous utilisons Église SaaS, la saisie des cotisations
            et le suivi des membres sont enfin simples. Notre trésorerie est
            claire, et le secrétariat gagne un temps précieux chaque semaine. »
          </blockquote>
          <figcaption className="mt-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-400/20 text-xs font-semibold text-violet-100 ring-1 ring-white/15">
              SM
            </span>
            <span>
              <span className="block text-sm font-medium text-white">
                Pasteur Samuel M.
              </span>
              <span className="block text-xs text-white/60">
                Église Bethel — communauté de 450 membres
              </span>
            </span>
          </figcaption>
        </figure>
          </>
        )}
      </aside>

      {/* Colonne droite — fond clair, formulaire épuré */}
      <main className={`flex flex-col ${isSky ? "bg-slate-50" : "bg-background"} px-6 py-10 sm:px-10 lg:px-14 xl:px-20`}>
        {/* Bandeau de marque visible sur mobile (colonne gauche masquée) */}
        <div className={`mb-8 flex items-center gap-3 lg:hidden`}>
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isSky ? "bg-orange-500/10 ring-1 ring-orange-500/20" : "bg-primary/10 ring-1 ring-primary/20"}`}>
            <Church className={`h-5 w-5 ${isSky ? "text-orange-600" : "text-primary"}`} aria-hidden />
          </span>
          <span className={`text-base font-semibold ${isSky ? "text-orange-700" : "text-foreground"}`}>
            Église SaaS
          </span>
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-md">
            <h2 className={`text-2xl font-semibold tracking-tight ${isSky ? "text-orange-800" : "text-foreground"}`}>
              {titre}
            </h2>
            <p className={`mt-1.5 text-sm ${isSky ? "text-slate-600" : "text-muted-foreground"}`}>{sousTitre}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>

        <p className={`mt-10 text-center text-xs ${isSky ? "text-slate-500" : "text-muted-foreground"}`}>
          © {new Date().getFullYear()} Église SaaS — Gestion de communauté
        </p>
      </main>
    </div>
  );
}