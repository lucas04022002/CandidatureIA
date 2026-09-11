import { describe, expect, it, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resetDatabase } from "../setup-db";
describe("schéma", () => {
  beforeAll(resetDatabase);
  it("crée les tables attendues", async () => {
    const rows = await db.execute(sql`select table_name from information_schema.tables where table_schema='public' order by 1`);
    const names = rows.rows.map((r: { table_name: string }) => r.table_name);
    for (const t of ["organisations","users","candidate_profiles","jobs","applications","search_runs","login_attempts","cv_imports"]) expect(names).toContain(t);
  });
});
