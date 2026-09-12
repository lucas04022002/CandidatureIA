import { sql } from "drizzle-orm";
import { db, isPglite } from "@/lib/db/client";

export async function resetDatabase() {
  await db.execute(sql`drop schema public cascade;`);
  await db.execute(sql`create schema public;`);
  // Le suivi des migrations déjà appliquées (table __drizzle_migrations) vit dans un schéma séparé
  // ("drizzle" par défaut, migrate() ne le documente pas mais le crée s'il n'existe pas), jamais
  // touché par le drop ci-dessus. Sans ce drop supplémentaire, `migrate()` croit que tout est déjà
  // appliqué (le schéma "drizzle" a survécu) et ne rejoue rien : schéma public vide, tables
  // absentes. Invisible avec PGlite (`pglite://memory` recrée une instance neuve à chaque fichier de
  // test, donc jamais de suivi résiduel) ; nécessaire contre un vrai Postgres partagé entre fichiers
  // de test (constaté en CI : tous les fichiers après le premier échouaient en « relation ... does
  // not exist », le premier ayant marqué la migration comme appliquée pour de bon).
  await db.execute(sql`drop schema if exists drizzle cascade;`);
  if (isPglite()) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db, { migrationsFolder: "drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder: "drizzle" });
  }
}
