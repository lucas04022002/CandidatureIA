import { db, closeDb, isPglite } from "../lib/db/client";

async function main() {
  if (isPglite) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db, { migrationsFolder: "drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder: "drizzle" });
  }
}

main()
  .then(closeDb)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
