// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/button";

describe("Button", () => {
  it("primary : bleu, texte blanc", () => {
    render(<Button variant="primary">Valider</Button>);
    const el = screen.getByRole("button", { name: "Valider" });
    expect(el.className).toMatch(/bg-klein\b/);
    expect(el.className).toMatch(/text-white\b/);
  });

  it("secondary : bordure encre", () => {
    render(<Button variant="secondary">Annuler</Button>);
    expect(screen.getByRole("button", { name: "Annuler" }).className).toMatch(/border-ink\b/);
  });

  it("onBlue : blanc sur bleu", () => {
    render(<Button variant="onBlue">Ouvrir</Button>);
    const el = screen.getByRole("button", { name: "Ouvrir" });
    expect(el.className).toMatch(/bg-white\b/);
    expect(el.className).toMatch(/text-klein\b/);
  });

  it("quiet : lien bleu foncé", () => {
    render(<Button variant="quiet">Relancer</Button>);
    expect(screen.getByRole("button", { name: "Relancer" }).className).toMatch(/text-klein-deep\b/);
  });

  it("danger : rouge sémantique, sans !important", () => {
    render(<Button variant="danger">Supprimer</Button>);
    const el = screen.getByRole("button", { name: "Supprimer" });
    expect(el.className).toMatch(/\btext-bad\b/);
    expect(el.className).not.toMatch(/!/);
  });

  it("pending : désactive le bouton et affiche … après le libellé", () => {
    render(<Button variant="primary" pending>Envoyer</Button>);
    const el = screen.getByRole("button");
    expect(el).toBeDisabled();
    expect(el).toHaveTextContent("Envoyer…");
  });

  it("rend un vrai <button>", () => {
    render(<Button variant="primary">Test</Button>);
    expect(screen.getByRole("button").tagName).toBe("BUTTON");
  });

  it("rend un <a> quand href est fourni", () => {
    render(<Button variant="primary" href="/jobs">Voir les offres</Button>);
    const el = screen.getByRole("link", { name: "Voir les offres" });
    expect(el.tagName).toBe("A");
    expect(el).toHaveAttribute("href", "/jobs");
  });
});
