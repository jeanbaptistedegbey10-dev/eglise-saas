import { Church, Quote, ShieldCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Mise en page « split-screen » des écrans d'authentification.
// Colonne gauche : bleu profond / nuit — marque, accueil, punchline et carte
// de témoignage. Colonne droite : fond clair, formulaire épuré.
// ---------------------------------------------------------------------------

type Props = {
  /** Titre affiché au-dessus du formulaire (colonne droite). */
  titre: string;
  /** Court paragraphe sous le titre. */
  sousTitre: string;
  /** Formulaire ou contenu de la colonne droite. */
  children: React.ReactNode;
};

export default function EcranAuth({ titre, sousTitre, children }: Props) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Colonne gauche — bleu profond / nuit */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#0b1233] via-[#151f56] to-[#1e1b4b] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
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
          <ul className="mt-8 grid gap-3 text-sm text-white/70">
            <li className="flex items-start gap-2.5">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-violet-300"
                aria-hidden
              />
              Cotisations, dons et finances suivis en toute transparence.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-violet-300"
                aria-hidden
              />
              Membres, départements et groupes centralisés en un seul endroit.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-violet-300"
                aria-hidden
              />
              Données sécurisées et accès contrôlés par rôle.
            </li>
          </ul>
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
      </aside>

      {/* Colonne droite — fond clair, formulaire épuré */}
      <main className="flex flex-col bg-background px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
        {/* Bandeau de marque visible sur mobile (colonne gauche masquée) */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Church className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <span className="text-base font-semibold text-foreground">
            Église SaaS
          </span>
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {titre}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{sousTitre}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Église SaaS — Gestion de communauté
        </p>
      </main>
    </div>
  );
}