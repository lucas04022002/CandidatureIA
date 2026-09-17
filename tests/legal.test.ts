import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LEGAL, NOT_APPLICABLE, TO_FILL } from "@/lib/legal";
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
    // L'hébergeur était annoncé comme Hetzner alors que le service répond
    // depuis un bloc OVH. Une mention fausse est pire qu'une mention absente.
    expect(html).toContain("OVH SAS");
    expect(html).not.toContain("Hetzner");
    expect(html).toContain("France Travail");
    expect(html).toContain("ab_session");
  });

  it("aucun « À COMPLÉTER » n'est affiché au visiteur", () => {
    const mentions = renderToStaticMarkup(createElement(MentionsLegales));
    const cgu = renderToStaticMarkup(createElement(Cgu));

    expect(mentions).not.toContain(TO_FILL);
    expect(cgu).not.toContain(TO_FILL);
  });

  it("n'annonce ni SIREN ni médiateur tant qu'il n'y en a pas", () => {
    // Deux champs sans objet : les afficher tels quels laisserait croire à une
    // immatriculation et à un contrat de consommation qui n'existent pas.
    expect(LEGAL.editorSiren).toBe(NOT_APPLICABLE);
    expect(LEGAL.mediator).toBe(NOT_APPLICABLE);

    const mentions = renderToStaticMarkup(createElement(MentionsLegales));
    expect(mentions).toContain("pas immatriculé");
    expect(mentions).not.toContain("SIREN Sans objet");

    const cgu = renderToStaticMarkup(createElement(Cgu));
    expect(cgu).toContain("aucun médiateur de la consommation");
    expect(cgu).not.toContain("médiation de la consommation suivant : Sans objet");
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
