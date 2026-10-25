import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import ThemeProviders from "@/components/layout/ThemeProviders";
import { lireConfiguration } from "@/lib/configuration-eglise";
import { obtenirAlertes } from "@/actions/alertes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Église SaaS — Gestion",
    template: "%s · Église SaaS",
  },
  description:
    "Plateforme de gestion communautaire, financère et comptable pour églises.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nom dynamique de l'église (configuration) pour l'en-tête mobile unique
  // et l'en-tête de la Sidebar. Repli "Église SaaS" si non configuré.
  const configuration = await lireConfiguration().catch(() => null);
  const alertes = await obtenirAlertes().catch(() => ({ cotisationsEnRetard: [], evenementsNonPrepares: [] }));

  return (
    // `next-themes` pilote la classe `.dark` sur <html> (voir globals.css
    // pour les jetons clair / sombre). `suppressHydrationWarning` évite les
    // avertissements liés à la résolution du thème côté client.
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProviders>
          {/* AppShell masque barre latérale et en-tête sur les écrans
              d'authentification (/login, /register, réinitialisation). */}
          <AppShell nomEglise={configuration?.nomOfficiel ?? ""} alertes={alertes}>
            {children}
          </AppShell>
        </ThemeProviders>
      </body>
    </html>
  );
}
