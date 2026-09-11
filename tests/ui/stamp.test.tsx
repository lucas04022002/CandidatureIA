// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stamp } from "@/components/stamp";

describe("Stamp", () => {
  it("Envoyé : texte, bleu, penché", () => {
    render(<Stamp status="Envoyé" />);
    const el = screen.getByText("Envoyé");
    expect(el.className).toMatch(/text-klein/);
    expect(el.style.transform).toBe("rotate(-5deg)");
  });

  it("Refusé : rouge sémantique", () => {
    render(<Stamp status="Refusé" />);
    expect(screen.getByText("Refusé").className).toMatch(/text-bad/);
  });

  it("Nouveau : gris, droit", () => {
    render(<Stamp status="Nouveau" />);
    const el = screen.getByText("Nouveau");
    expect(el.className).toMatch(/text-grey/);
    expect(el.style.transform).toBe("rotate(0deg)");
  });

  it("n'est pas une région live : un tampon décrit un état déjà à l'écran", () => {
    // `role="status"` promettait une annonce à chaque apparition — six tuiles d'offres en
    // annonçaient six. Le tampon reste un simple texte, nommé pour les lecteurs d'écran.
    render(<Stamp status="Envoyé" />);
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    expect(screen.getByText("Envoyé")).toHaveAttribute("aria-label", "Envoyé");
  });
});
