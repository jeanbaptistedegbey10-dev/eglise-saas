"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof NextThemesProvider>;

/**
 * Fournisseurs globaux : session NextAuth (`useSession` dans Header /
 * Sidebar) + thème clair / sombre (`next-themes`, classe `.dark` sur <html>).
 */
export default function ThemeProviders({ children, ...props }: Props) {
  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} {...props}>
        {children}
      </NextThemesProvider>
    </SessionProvider>
  );
}
