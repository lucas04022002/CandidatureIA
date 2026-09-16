import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LEGAL, TO_FILL } from "@/lib/legal";
import MentionsLegales from "@/app/mentions-legales/page";
import Cgu from "@/app/cgu/page";

const champsNonRemplis = () =>
  Object.entries(LEGAL)
    .filter(([, valeur]) => valeur === TO_FILL)
    .map(([champ]) => champ);

describe("pages légales", () => {
  it("/mentions-legales rend sans erreur et sans champ indéfini", () => {
    const html = renderToStaticMarkup(createElement(MentionsLegales));
    expect(html).not.toContain("undefined");
    expect(html).toContain("Hetzner");
    expect(html).toContain("France Travail");
    expect(html).toContain("ab_session");
  });

  it("/cgu rend sans erreur et sans champ indéfini", () => {
    const html = renderToStaticMarkup(createElement(Cgu));
    expect(html).not.toContain("undefined");
    expect(html).toContain("sous-traitant");
    expect(html).toContain("etudiant");
  });

  // Garde-fou de mise en ligne : ce test n'échoue que si CI_STRICT_LEGAL vaut "1", c'est-à-dire
  // au moment où Lucas décide que les pages légales doivent être complètes (lancement commercial).
  it("aucun champ « À COMPLÉTER » quand CI_STRICT_LEGAL vaut 1", () => {
    const restants = champsNonRemplis();
    if (process.env.CI_STRICT_LEGAL === "1") {
      expect(restants).toEqual([]);
    } else {
      // Hors mode strict : on vérifie seulement que le garde-fou sait lire les champs de LEGAL.
      expect(Object.keys(LEGAL).length).toBeGreaterThan(0);
      expect(restants.every((champ) => champ in LEGAL)).toBe(true);
    }
  });
});
