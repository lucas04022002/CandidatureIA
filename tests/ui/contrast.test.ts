// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

// Calcul WCAG 2.x du ratio de contraste (formule officielle) : luminance relative sRGB
// puis (L_claire + 0.05) / (L_sombre + 0.05). Aucun raccourci — les jetons réels de
// app/globals.css sont lus et convertis, pas une valeur simulée.
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [channel(r), channel(g), channel(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexToRgb(hexA));
  const lb = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function collectSources(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((f) => f.split("\\").join("/"))
    .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
    .map((f) => `${dir}/${f}`);
}

function readTokens(): Record<string, string> {
  const css = readFileSync("app/globals.css", "utf8");
  const tokens: Record<string, string> = {};
  const re = /--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css))) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

const PAIRS: Array<[string, string]> = [
  ["ink", "paper"],
  ["ink", "white"],
  ["grey", "paper"],
  ["grey", "white"],
  ["white", "klein"],
  ["klein-deep", "paper"],
  ["klein-deep", "white"],
  ["klein", "white"],
  // Les fonds sémantiques et le fond bleu clair : ils portent du texte à l'écran (bandeaux d'état,
  // étiquettes) et n'étaient couverts par aucune paire — c'est exactement là que `warn` et `good`
  // passaient sous 4,5:1 sans que rien ne le dise.
  ["warn", "warn-soft"],
  ["good", "good-soft"],
  ["bad", "bad-soft"],
  ["klein-deep", "klein-soft"],
  ["good", "paper"],
];

// `grey` / `klein-soft` est délibérément ABSENTE de la liste : la paire sort à 4,26:1, mais elle
// n'existe nulle part à l'écran — toutes les surfaces `bg-klein-soft` portent `text-klein-deep` ou
// `text-klein`. Assombrir `--color-grey` jusqu'à 4,5:1 sur ce fond (≈ #5F6170) changerait le texte
// secondaire de TOUTE l'interface, et aplatirait la hiérarchie ink/gris, pour une combinaison qui
// n'est jamais rendue. On garde le jeton, et on interdit la combinaison par un grep : une frontière
// qui tient toute seule, plutôt qu'une note dans un fichier de spec.
const SOFT_BG = "bg-klein-soft";
// `text-grey` isolé : bordé par un espace, un guillemet ou une limite de chaîne, pour ne pas
// confondre avec un éventuel `text-greyish`.
const GREY_TEXT = /(?:^|[\s"'`])text-grey(?:[\s"'`]|$)/;
const ATTRIBUTE = /class(?:Name)?=(?:"[^"]*"|\{`[^`]*`\}|\{[^}]*\})/g;

describe("contraste AA des jetons", () => {
  const tokens = readTokens();

  it.each(PAIRS)("%s / %s >= 4.5:1", (a, b) => {
    const hexA = tokens[a];
    const hexB = tokens[b];
    expect(hexA, `jeton --color-${a} introuvable dans app/globals.css`).toBeDefined();
    expect(hexB, `jeton --color-${b} introuvable dans app/globals.css`).toBeDefined();
    const ratio = contrastRatio(hexA, hexB);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe("gris sur bleu clair", () => {
  it("aucun fichier ne pose `text-grey` sur une surface `bg-klein-soft` (4,26:1, sous AA)", () => {
    const files = [...collectSources("app"), ...collectSources("components")];
    // Le grep ne vaut que s'il lit vraiment quelque chose : une liste vide passerait à vide.
    expect(files.length).toBeGreaterThan(40);

    const bad: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const attr of src.match(ATTRIBUTE) ?? []) {
        // Deux niveaux, pour être juste dans les deux sens. Un attribut SANS condition (`?`)
        // applique toutes ses classes au même élément : on le lit d'un bloc, ce qui attrape aussi
        // `cn("… bg-klein-soft", "text-grey")`. Dès qu'une condition apparaît, les littéraux sont
        // des branches exclusives (cas réel dans /admin : `bg-klein-soft + text-klein-deep` OU
        // `border-line + text-grey`) — on les examine alors un par un, sinon la garde crie à tort.
        const candidates = attr.includes("?") ? (attr.match(/"[^"]*"|`[^`]*`/g) ?? []) : [attr];
        for (const candidate of candidates) {
          if (candidate.includes(SOFT_BG) && GREY_TEXT.test(candidate)) {
            bad.push(`${file} : ${candidate}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("focus visible sur les surfaces bleues", () => {
  it("app/globals.css repasse le contour du focus en blanc sous un ancêtre .bg-klein", () => {
    const css = readFileSync("app/globals.css", "utf8");
    // Le contour global reste bleu Klein…
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-klein\)/);
    // …et bascule en blanc à l'intérieur d'une surface bleue, sinon il est invisible.
    expect(css).toMatch(/\.bg-klein\s+:focus-visible\s*\{[^}]*outline-color:\s*var\(--color-white\)/);
  });
});
