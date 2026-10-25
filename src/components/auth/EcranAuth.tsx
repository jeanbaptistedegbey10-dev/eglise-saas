import React from "react";
import { Church } from "lucide-react";
import { lireConfiguration } from "@/lib/configuration-eglise";

interface EcranAuthProps {
  children?: React.ReactNode;
  titre?: string;
  sousTitre?: string;
  theme?: "sky-orange" | "violet";
}

export default async function EcranAuth({
  children,
  titre = "Connexion",
  sousTitre = "Accédez à votre espace de gestion sécurisé.",
  theme = "sky-orange",
}: EcranAuthProps) {
  const config = await lireConfiguration();
  const isSky = theme === "sky-orange";

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Partie Gauche : Presentation de l'Entite */}
      <div
        className={`hidden lg:flex flex-col justify-between p-12 text-white ${
          isSky
            ? "bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900"
            : "bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-950"
        }`}
      >
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded-xl" />
              ) : (
                <Church className="h-6 w-6 text-white"/>
              )}
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{config.nomOfficiel || "Église"}</h1>
              <p className="text-xs text-white/70">Gestion communautaire & spirituelle</p>
            </div>
          </div>

          <div className="space-y-6 max-w-lg mt-12">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Bienvenue sur votre espace
            </h2>
            <p className="text-white/80 leading-relaxed text-sm">
              {!config.mission || config.mission === config.nomOfficiel
                ? "La plateforme unifiée pour la gestion communautaire, le suivi pastoral, les finances et les événements de notre assemblée."
                : config.mission}
            </p>

            <div className="bg-white/10 border border-white/15 rounded-2xl p-5 backdrop-blur-sm space-y-3 mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">Informations clés de l'assemblée</h3>
              <div className="text-sm space-y-1 text-white/90">
                <p><span className="font-medium text-white">Siège :</span> {config.adresseSiege || "Non renseigné"}, {config.ville || ""}</p>
                <p><span className="font-medium text-white">Contact :</span> {config.emailContact || "contact@eglise.org"}</p>
                {config.telephones && config.telephones.length > 0 && (
                  <p><span className="font-medium text-white">Tél :</span> {config.telephones.join(", ")}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 text-xs text-white/60 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} &mdash; Solution de gestion église</span>
          <span>Sécurisé & Conforme</span>
        </div>
      </div>

      {/* Partie Droite : Formulaire dynamique (children ou titre/sous-titre) */}
      <div className="flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 bg-card text-card-foreground">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Church className="h-5 w-5 text-primary"/>
            </div>
            <div>
              <h1 className="font-bold text-base">{config.nomOfficiel || "Église"}</h1>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">{titre}</h2>
            {sousTitre && (
              <p className="text-sm text-muted-foreground">{sousTitre}</p>
            )}
          </div>

          {children}

          <p className="text-center text-xs text-muted-foreground pt-4">
            &copy; {new Date().getFullYear()} &mdash; Gestion de communauté
          </p>
        </div>
      </div>
    </div>
  );
}
