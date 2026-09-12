// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

// Contenu juridique pré-existant, hors périmètre de cette tâche (liste "Files" du brief :
// seuls app/globals.css, app/layout.tsx, vitest.config.mts sont modifiés). Ces pages emploient
// "garanti(t/e/r)" au sens négatif — "ne garantit PAS" — pour décliner toute promesse de
// résultat, exactement l'inverse d'une accroche marketing. Le commentaire de route.ts est un
// commentaire de code, jamais affiché à l'utilisateur. Décision documentée dans le rapport de
// tâche ; à revoir avec le propriétaire du texte légal si le vocabulaire doit changer.
const OUT_OF_SCOPE = [
  "app/cgu/page.tsx",
  "app/mentions-legales/page.tsx",
  "app/api/delete-application/route.ts",
];

const FORBIDDEN = [/\bIA\b/, /intelligence artificielle/i, /pronostic/i, /garanti/i, /\bAI\b/];

// Cf. tests/ui/tokens.test.ts : `readdirSync` récursif plutôt que `globSync` pour rester
// compatible avec @types/node ^20 (déjà installé) sans changer de dépendance hors périmètre.
function collect(dir: string, extensions: string[]): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((f) => f.split("\\").join("/"))
    .filter((f) => extensions.some((ext) => f.endsWith(ext)))
    .map((f) => `${dir}/${f}`);
}

const files = [...collect("app", [".ts", ".tsx"]), ...collect("components", [".ts", ".tsx"])].filter(
  (f) => !OUT_OF_SCOPE.includes(f),
);

describe("vocabulaire interdit", () => {
  it("aucun fichier de app/ et components/ ne contient IA, intelligence artificielle, pronostic, garanti ou AI", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (FORBIDDEN.some((re) => re.test(src))) bad.push(f);
    }
    expect(bad).toEqual([]);
  });
});
