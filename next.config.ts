import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Nodemailer (Brevo SMTP) est une dépendance Node native : on l'exclut du
   * bundling serveur de Next pour éviter les erreurs d'agrégation ESM/CJS.
   */
  serverExternalPackages: ["nodemailer"],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      /*
       * Le formulaire des paramètres soumet le logo officiel en data URL
       * (base64) via le Server Action `enregistrerParametres`. La limite par
       * défaut (1 Mo) serait trop juste : on autorise 4 Mo pour un fichier
       * source de 2 Mo maximum (voir `LogoUploader.tsx`).
       */
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
