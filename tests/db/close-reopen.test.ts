import { describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

// `lib/db/client.ts` mémorise son instance sur `globalThis` (une seule base par processus, sinon en
// dev les routes API et les pages en ouvrent deux sur le même dossier). `closeDb` doit donc aussi
// OUBLIER cette mémoire : sinon elle continue de pointer sur une instance fermée, et tout import
// ultérieur dans le même processus récupère une base morte au lieu d'en ouvrir une.
describe("closeDb", () => {
  it("oublie le cache global, et un import ultérieur rouvre une base utilisable", async () => {
    const g = globalThis as unknown as { __applybotDb?: unknown };

    const first = await import("@/lib/db/client");
    expect(g.__applybotDb, "l'instance devrait être en cache après l'import").toBeDefined();

    await first.closeDb();
    expect(g.__applybotDb, "le cache devrait être vide après fermeture").toBeUndefined();

    // Nouveau graphe de modules : c'est la situation réelle (un autre point d'entrée importe le
    // client à son tour). Sans l'oubli du cache, `open()` n'est pas rappelé.
    vi.resetModules();
    const second = await import("@/lib/db/client");
    expect(g.__applybotDb).toBeDefined();

    // Et la base rouverte répond vraiment — une référence en cache pointant sur une instance fermée
    // aurait levé ici, pas à l'import.
    const result = (await second.db.execute(sql`select 1 as un;`)) as { rows: Array<{ un: number }> };
    expect(result.rows).toHaveLength(1);
  });
});
