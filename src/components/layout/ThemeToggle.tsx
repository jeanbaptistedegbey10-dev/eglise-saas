"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Bascule clair / sombre (Soleil / Lune).
 * Utilise `next-themes` : ajoute/retire la classe `.dark` sur <html>.
 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-card-border bg-card text-muted-foreground shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-amber-400" aria-hidden />
      ) : (
        <Moon className="h-4.5 w-4.5 text-teal-600" aria-hidden />
      )}
    </button>
  );
}
