// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Score } from "@/components/score";

describe("Score", () => {
  it("affiche la valeur et le libellé « correspondance » (tile)", () => {
    render(<Score value={86} size="tile" />);
    expect(screen.getByText("86")).toBeInTheDocument();
    expect(screen.getByText("correspondance")).toBeInTheDocument();
  });

  it("affiche la valeur en taille hero", () => {
    render(<Score value={72} size="hero" />);
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("correspondance")).toBeInTheDocument();
  });
});
