import { existsSync } from "node:fs";

/**
 * Charge `.env` dans `process.env` pour les scripts lancés hors de Next.js.
 *
 * Next.js lit `.env` / `.env.local` tout seul, mais `npm run db:migrate`,
 * `npm run create-admin` et `npm run purge-inactive` s'exécutent via `tsx`, qui ne charge rien :
 * `lib/db/client.ts` levait « DATABASE_URL manquante » alors que le fichier existait, exactement en
 * suivant les instructions du README.
 *
 * À importer EN PREMIER dans un script, avant tout module qui lit `process.env` au chargement
 * (`lib/db/client.ts` le fait) : les imports ESM sont évalués dans l'ordre d'écriture.
 *
 * Silencieux si le fichier n'existe pas : en production (image Docker, Coolify) les variables
 * viennent de l'environnement du conteneur, il n'y a pas de `.env` et ce n'est pas une erreur.
 * Les variables déjà présentes dans l'environnement gagnent — `process.loadEnvFile` n'écrase rien.
 */
const ENV_FILES = [".env.local", ".env"];

for (const file of ENV_FILES) {
  if (existsSync(file)) process.loadEnvFile(file);
}
