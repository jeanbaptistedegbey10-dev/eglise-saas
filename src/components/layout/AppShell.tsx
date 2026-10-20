"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import HeaderMobile from "@/components/layout/HeaderMobile";
import { MenuUtilisateur } from "@/components/layout/Header";
import HeaderNotifications, { type AlertesResume } from "@/components/layout/HeaderNotifications";
import ThemeToggle from "@/components/layout/ThemeToggle";
import ChatbotAide from "@/components/layout/ChatbotAide";

// ---------------------------------------------------------------------------
// Coquille de l'application : barre latérale + en-tête autour du contenu.
// La landing ("/") et les écrans d'authentification (connexion, inscription,
// réinitialisation) sont rendus plein écran, sans chrome applicatif.
// ---------------------------------------------------------------------------

/**
 * Chemins rendus plein écran (sans barre latérale ni en-tête) : landing "/",
 * écrans d'authentification et relevé public `/releve/[token]` (impression).
 * NOTE : "/" est testé en égalité stricte dans `estPageAuth` — il ne masque
 * pas les autres routes ("/finances" ne commence pas par "//").
 */
const CHEMINS_AUTH = [
  "/",
  "/login",
  "/register",
  "/verifier-code",
  "/mot-de-passe-oublie",
  "/reinitialisation-mot-de-passe",
  "/releve",
];

function estPageAuth(pathname: string): boolean {
  return CHEMINS_AUTH.some(
    (chemin) => pathname === chemin || pathname.startsWith(`${chemin}/`),
  );
}

export default function AppShell({
  children,
  nomEglise = "",
  alertes = { cotisationsEnRetard: [], evenementsNonPrepares: [] },
}: {
  children: React.ReactNode;
  nomEglise?: string;
  alertes?: AlertesResume;
}) {
  const pathname = usePathname();
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);

  // Ferme le tiroir mobile à chaque navigation.
  useEffect(() => {
    setMenuMobileOuvert(false);
  }, [pathname]);

  // Verrouille le défilement du fond quand le tiroir est ouvert.
  useEffect(() => {
    if (!menuMobileOuvert) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuMobileOuvert]);

  if (estPageAuth(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar desktop : masquée sur mobile. */}
      <Sidebar className="hidden md:flex" nomEglise={nomEglise} />
      {/* Tiroir mobile + fond assombri. */}
      {menuMobileOuvert && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer le menu de navigation"
            onClick={() => setMenuMobileOuvert(false)}
            className="fixed inset-0 z-50 bg-black/80"
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-full max-w-[85vw] sm:w-80 shadow-xl">
            <Sidebar
              className="flex"
              nomEglise={nomEglise}
              onNavigate={() => setMenuMobileOuvert(false)}
            />
            <button
              type="button"
              aria-label="Fermer le menu de navigation"
              onClick={() => setMenuMobileOuvert(false)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md bg-background text-foreground shadow outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* UN SEUL en-tête mobile supérieur : logo + nom dynamique à gauche,
            bouton Hamburger à droite. */}
        <HeaderMobile
          nomEglise={nomEglise}
          onOuvrir={() => setMenuMobileOuvert(true)}
        />
        {/* Barre desktop : bascule thème + menu utilisateur (nom, rôle, avatar).
            Masquée sur mobile pour ne garder qu'un seul bandeau (`hidden md:flex`). */}
        <div className="sticky top-0 z-20 hidden items-center justify-end gap-3 border-b border-sidebar-border bg-sidebar/90 px-8 py-2.5 backdrop-blur md:flex">
          <ThemeToggle />
          <HeaderNotifications alertes={alertes} />
          <MenuUtilisateur />
        </div>
        <main className="flex-1 h-screen overflow-y-auto p-6">{children}</main>
      </div>
<ChatbotAide />
    </div>
  );
}