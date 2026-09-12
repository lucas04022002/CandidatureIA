import * as schema from "./schema";
import type { PgDatabase } from "drizzle-orm/pg-core";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL manquante");
const url: string = rawUrl;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- les deux pilotes (pglite / node-postgres) ont des TQueryResult incompatibles ; `any` unifie l'API `db` exposée.
type Db = PgDatabase<any, typeof schema>;

let closeFn: () => Promise<void> = async () => {};

function open(): Db {
  if (url.startsWith("pglite://")) {
    // require() : chargement paresseux du seul pilote nécessaire (évite d'embarquer `pg` et `@electric-sql/pglite` tous les deux).
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
    const { drizzle } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
    /* eslint-enable @typescript-eslint/no-require-imports */
    const target = url.slice("pglite://".length);
    const client = new PGlite(target === "memory" ? undefined : target);
    closeFn = () => client.close();
    return drizzle(client, { schema }) as unknown as Db;
  }
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Pool } = require("pg") as typeof import("pg");
  const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const pool = new Pool({ connectionString: url, max: 10 });
  closeFn = () => pool.end();
  return drizzle(pool, { schema }) as unknown as Db;
}

// En dev, Next.js compile les routes API et les pages dans des graphes de modules séparés : sans
// cache global, chaque graphe ouvrirait sa propre instance PGlite sur le même dossier, et une
// écriture faite par une route resterait invisible des pages jusqu'au redémarrage. On mémorise
// donc l'instance sur `globalThis`, clé par URL (même motif que le singleton Prisma/Drizzle).
type DbCache = { url: string; db: Db; close: () => Promise<void> };
const g = globalThis as unknown as { __applybotDb?: DbCache };
if (!g.__applybotDb || g.__applybotDb.url !== url) {
  const opened = open();
  g.__applybotDb = { url, db: opened, close: closeFn };
}
export const db: Db = g.__applybotDb.db;
// Fermer sans oublier le cache laissait `globalThis.__applybotDb` pointer sur une instance morte :
// tout import ultérieur dans le même processus (un test qui ferme puis rouvre, un script qui
// enchaîne deux connexions) récupérait la référence en cache au lieu d'ouvrir une base, et échouait
// sur un client déjà fermé. On supprime l'entrée : le prochain import retombe sur `open()`.
export const closeDb = async () => {
  const cached = g.__applybotDb;
  if (!cached) return;
  delete g.__applybotDb;
  await cached.close();
};
export const isPglite = url.startsWith("pglite://");
