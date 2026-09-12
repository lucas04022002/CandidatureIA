import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite embarque un fichier WASM que webpack ne sait pas copier : le paquet doit rester externe au bundle serveur
  // (idem pour pg, pilote natif Node). Sans cela, `next dev` répond « Erreur interne » à la première requête SQL.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  turbopack: {
    root: process.cwd(),
  },
  // Build autonome (server.js + node_modules minimal) : c'est ce que le Dockerfile copie dans
  // l'image finale, sans embarquer le reste du dépôt ni un `npm install` en production.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // HSTS : le navigateur refuse tout http:// sur le domaine pendant un an. Coolify/Traefik
          // termine TLS en amont et l'appli parle http en interne, mais l'en-tête est relayé tel
          // quel jusqu'au navigateur — c'est lui qui l'applique, et c'est bien la connexion
          // navigateur↔Traefik (celle qui traverse Internet) qu'il protège. Pas de `preload` :
          // l'inscription à la liste des navigateurs est quasi irréversible et engagerait aussi
          // tous les sous-domaines, à décider au lancement commercial, pas ici.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
