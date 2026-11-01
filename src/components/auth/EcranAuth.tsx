"use client";

import React, { useState } from "react";
import { Church } from "lucide-react";
import { ConfigurationEglise } from "@/lib/configuration-eglise";

interface EcranAuthProps {
  children?: React.ReactNode;
  configuration?: ConfigurationEglise;
  titre?: string;
  sousTitre?: string;
  theme?: "sky-orange" | "violet";
}

const VIDEO_SOURCES = [
  { src: "/background.mp4", type: "video/mp4" },
  {
    src: "https://cdn.pixabay.com/video/2023/06/16/131836-851342664_small.mp4",
    type: "video/mp4",
  },
] as const;

export default function EcranAuth({
  children,
  configuration,
  titre = "Connexion",
  sousTitre = "Accédez à votre espace de gestion sécurisé.",
  theme = "sky-orange",
}: EcranAuthProps) {
  const [videoError, setVideoError] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Vidéo en arrière-plan */}
      {!videoError && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover -z-10"
          onError={() => setVideoError(true)}
        >
          {VIDEO_SOURCES.map((source, index) => (
            <source key={index} src={source.src} type={source.type} />
          ))}
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      )}
      {videoError && (
        <div
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-black -z-10"
        />
      )}
      {/* Overlay sombre pour le contraste */}
      <div className="absolute inset-0 bg-black/50 -z-10"></div>

      {/* Partie unique : Formulaire centré */}
      <div className="w-full max-w-md p-8 sm:p-10 bg-white/10 dark:bg-black/40 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Church className="h-5 w-5 text-primary"/>
            </div>
            <div>
              <h1 className="font-bold text-base text-white">{configuration?.nomOfficiel || "Église"}</h1>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">{titre}</h2>
            {sousTitre && (
              <p className="text-sm text-white/80">{sousTitre}</p>
            )}
          </div>

          {children}

          <p className="text-center text-xs text-white/80 pt-4">
            &copy; 2026 Digital Infotech
          </p>
        </div>
      </div>
    </div>
  );
}
