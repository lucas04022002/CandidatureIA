// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

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
];

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
