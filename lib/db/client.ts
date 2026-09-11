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

export const db: Db = open();
export const closeDb = () => closeFn();
export const isPglite = url.startsWith("pglite://");
