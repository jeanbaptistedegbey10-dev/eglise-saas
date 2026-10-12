"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof NextThemesProvider>;

/**
 * Fournisseur de thème global (clair / sombre).
 * `attribute="class"` pilote la classe `.dark` sur <html>,
 * compatible avec `@custom-variant dark` de Tailwind v4.
 */
export default function ThemeProviders({ children, ...props }: Props) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} {...props}>
      {children}
    </NextThemesProvider>
  );
}
