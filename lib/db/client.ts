import * as schema from "./schema";
import type { PgDatabase } from "drizzle-orm/pg-core";

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante");
  return url;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- les deux pilotes (pglite / node-postgres) ont des TQueryResult incompatibles ; `any` unifie l'API `db` exposée.
type Db = PgDatabase<any, typeof schema>;

function open(url: string): { db: Db; close: () => Promise<void> } {
  if (url.startsWith("pglite://")) {
    // require() : chargement paresseux du seul pilote nécessaire (évite d'embarquer `pg` et `@electric-sql/pglite` tous les deux).
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
    const { drizzle } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
    /* eslint-enable @typescript-eslint/no-require-imports */
    const target = url.slice("pglite://".length);
    const client = new PGlite(target === "memory" ? undefined : target);
    return { db: drizzle(client, { schema }) as unknown as Db, close: () => client.close() };
  }
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Pool } = require("pg") as typeof import("pg");
  const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const pool = new Pool({ connectionString: url, max: 10 });
  return { db: drizzle(pool, { schema }) as unknown as Db, close: () => pool.end() };
}

// Ouverture PAResseuse et unique par processus.
// - Paresseuse : `next build` importe pages et routes dans 15 processus parallèles pour générer les
//   pages statiques ; ouvrir la base au chargement du module faisait ouvrir PGlite quinze fois sur
//   le même dossier (« PGlite failed to initialize properly »). Rien ne s'ouvre avant la première
//   requête, donc un build n'ouvre jamais la base.
// - Unique : en dev, Next.js compile routes API et pages dans des graphes de modules séparés ; sans
//   cache global, chaque graphe ouvrirait sa propre instance PGlite sur le même dossier et une
//   écriture faite par une route resterait invisible des pages jusqu'au redémarrage. L'instance est
//   mémorisée sur `globalThis`, clé par URL (même motif que le singleton Prisma/Drizzle).
type DbCache = { url: string; db: Db; close: () => Promise<void> };
const g = globalThis as unknown as { __applybotDb?: DbCache };

function getDb(): Db {
  const url = databaseUrl();
  if (!g.__applybotDb || g.__applybotDb.url !== url) {
    const opened = open(url);
    g.__applybotDb = { url, db: opened.db, close: opened.close };
  }
  return g.__applybotDb.db;
}

// `db` garde la même API qu'une instance Drizzle : chaque accès est délégué à l'instance réelle,
// ouverte au premier appel. Les méthodes sont liées à l'instance pour que `this` reste correct.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});
export const closeDb = async () => {
  const cached = g.__applybotDb;
  if (!cached) return;
  delete g.__applybotDb;
  await cached.close();
};
export const isPglite = () => databaseUrl().startsWith("pglite://");
