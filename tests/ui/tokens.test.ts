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

// Palette Tailwind numérotée : aucune de ces familles n'est un jeton du projet. `fuchsia` manquait
// à la liste — la seule famille de la palette par défaut qui n'y était pas, donc la seule qui
// serait passée sans rien déclencher.
const NUMBERED_FAMILY =
  /\b(text|bg|border|ring|from|to|via|outline|decoration|divide|accent|caret|shadow|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-\d{2,3}\b/;

// Les deux couleurs sans suffixe numérique, que la règle ci-dessus laisse passer par construction.
// `white` EST un jeton du projet (`--color-white: #ffffff`) : `text-white` / `bg-white` sont donc
// légitimes et très utilisés (barre bleue, cartes). `black` n'en est pas un : il n'existe nulle part
// dans `@theme`, donc `text-black` retomberait sur le noir par défaut de Tailwind — une couleur hors
// jetons, exactement ce que cette garde existe pour empêcher.
const BARE_BLACK = /\b(text|bg|border|ring|from|to|via|outline|decoration|divide|accent|caret|fill|stroke)-black\b/;

describe("aucune couleur hors jetons", () => {
  it("pas de couleur en dur dans app/ et components/, sans aucune exclusion", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (/#[0-9a-fA-F]{3,8}\b|\b(rgb|oklch|hsl)a?\(/.test(src)) bad.push(f);
      if (NUMBERED_FAMILY.test(src)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });

  it("`black` est banni (aucun jeton), `white` est autorisé (c'en est un)", () => {
    // La garde ne vaut que si elle lit vraiment des fichiers.
    expect(files.length).toBeGreaterThan(40);

    const bad: string[] = [];
    let whiteSeen = 0;
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (BARE_BLACK.test(src)) bad.push(f);
      if (/\b(text|bg|border)-white\b/.test(src)) whiteSeen += 1;
    }
    expect(bad).toEqual([]);
    // `white` est bien utilisé et reste toléré : sans cette assertion, la règle ci-dessus
    // « passerait » tout aussi bien si on avait banni les deux par erreur.
    expect(whiteSeen).toBeGreaterThan(0);
  });
});
