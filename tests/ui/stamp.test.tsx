// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stamp } from "@/components/stamp";
describe("Stamp", () => {
  it("Envoyé : texte, bleu, penché", () => {
    render(<Stamp status="Envoyé" />);
    const el = screen.getByRole("status");
    expect(el).toHaveTextContent("Envoyé");
    expect(el.className).toMatch(/text-klein/);
    expect(el.style.transform).toBe("rotate(-5deg)");
  });
  it("Refusé : rouge sémantique", () => { render(<Stamp status="Refusé" />); expect(screen.getByRole("status").className).toMatch(/text-bad/); });
  it("Nouveau : gris, droit", () => { render(<Stamp status="Nouveau" />); const el = screen.getByRole("status"); expect(el.className).toMatch(/text-grey/); expect(el.style.transform).toBe("rotate(0deg)"); });
});
