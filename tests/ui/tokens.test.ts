// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

// Plus aucune exclusion : les deux dossiers de l'ancienne interface ont été supprimés en
// tâche 5, et toutes les pages sont écrites en jetons. La liste reste — vide — pour que l'intention soit
// lisible : si elle se remplit à nouveau, c'est qu'une couleur hors jetons est entrée quelque part
// et qu'on a préféré la contourner plutôt que la corriger.
const LEGACY_PATHS: string[] = [];

// `globSync` (node:fs) est bien disponible au runtime (Node 25) mais @types/node reste en
// ^20 dans ce projet : on liste récursivement avec `readdirSync` (typé, sans dépendance de
// version) plutôt que d'élargir @types/node hors du périmètre de cette tâche.
function collect(dir: string, extensions: string[]): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((f) => f.split("\\").join("/"))
    .filter((f) => extensions.some((ext) => f.endsWith(ext)))
    .map((f) => `${dir}/${f}`);
}

const files = [...collect("app", [".ts", ".tsx", ".css"]), ...collect("components", [".ts", ".tsx"])]
  .filter((f) => !f.endsWith("globals.css"))
  .filter((f) => !LEGACY_PATHS.some((legacy) => f.includes(legacy)));

describe("aucune couleur hors jetons", () => {
  it("pas de couleur en dur dans app/ et components/, sans aucune exclusion", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (/#[0-9a-fA-F]{3,8}\b|\b(rgb|oklch|hsl)a?\(/.test(src)) bad.push(f);
      if (
        /\b(text|bg|border|ring|from|to)-(red|blue|gray|grey|slate|zinc|neutral|stone|green|emerald|amber|yellow|orange|indigo|violet|purple|pink|rose|sky|cyan|teal|lime)-\d{2,3}\b/.test(
          src,
        )
      )
        bad.push(f);
    }
    expect(bad).toEqual([]);
  });
});
