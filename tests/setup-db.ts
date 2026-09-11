import { sql } from "drizzle-orm";
import { db, isPglite } from "@/lib/db/client";

export async function resetDatabase() {
  await db.execute(sql`drop schema public cascade;`);
  await db.execute(sql`create schema public;`);
  if (isPglite) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db, { migrationsFolder: "drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder: "drizzle" });
  }
}
