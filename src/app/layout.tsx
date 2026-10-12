import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import ThemeProviders from "@/components/layout/ThemeProviders";
import ThemeToggle from "@/components/layout/ThemeToggle";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `next-themes` pilote la classe `.dark` sur <html> (voir globals.css
    // pour les jetons clair / sombre). `suppressHydrationWarning` évite les
    // avertissements liés à la résolution du thème côté client.
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProviders>
          <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Barre supérieure : visible surtout sur mobile (Sidebar masquée),
                  donne accès au bascule clair / sombre partout. */}
              <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar/90 px-4 py-3 backdrop-blur sm:px-8 md:hidden">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                    É
                  </span>
                  Église SaaS
                </span>
                <ThemeToggle />
              </header>
              {/* Bascule desktop : ancrée en haut à droite du contenu. */}
              <div className="pointer-events-none sticky top-0 z-20 hidden justify-end px-8 pt-4 md:flex">
                <div className="pointer-events-auto">
                  <ThemeToggle />
                </div>
              </div>
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </div>
        </ThemeProviders>
      </body>
    </html>
  );
}
