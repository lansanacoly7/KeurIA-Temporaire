import type { NextConfig } from "next";

// Adresse du serveur Django : la même variable que le rendu serveur (app/local-auth.ts), pour n'avoir qu'un seul
// réglage. En production, définir DJANGO_API_URL (ex. http://127.0.0.1:8000 si Django tourne sur la même machine).
// Lue au build (réécritures) : la fixer avant `npm run build`.
const backendUrl = (process.env.DJANGO_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

// Politique de contenu en mode « rapport seul » : elle ne bloque rien, mais le navigateur signale dans sa console
// ce qu'une politique stricte casserait. À durcir (et passer en Content-Security-Policy) une fois la console propre.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self' https://scratch.mit.edu",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Politique APPLIQUÉE (pas seulement signalée) : ce qui est sans risque pour l'application et qui ferme les attaques les plus
// courantes : intégration du site dans une page étrangère (clickjacking), formulaires envoyés ailleurs, balise <base> détournée,
// plug-ins. Le contrôle des scripts reste en « rapport seul » ci-dessus tant que la console n'est pas propre.
const cspEnforced = ["base-uri 'self'", "object-src 'none'", "frame-ancestors 'self'", "form-action 'self'"].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Django attend une barre finale sur certaines routes (/api/curriculum/glossary/) : sans ce réglage, Next la retire (308)
  // puis Django la remet (301), à l'infini, et la page ne se charge jamais.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // Les routes Django terminées par « / » doivent arriver avec leur barre finale : le motif générique la supprime.
      { source: "/api/:path*/", destination: `${backendUrl}/api/:path*/` },
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/media/:path*", destination: `${backendUrl}/media/:path*` },
      { source: "/static/:path*", destination: `${backendUrl}/static/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // La caméra sert aux activités de vision (MediaPipe) ; tout le reste est refusé.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
          { key: "Content-Security-Policy", value: cspEnforced },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
          // HTTPS obligatoire pendant un an pour les navigateurs qui ont déjà visité le site (les pages HTML sont servies par Next,
          // pas par Django : l'en-tête doit être posé ici). Ignoré en HTTP simple, donc sans effet en développement.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
