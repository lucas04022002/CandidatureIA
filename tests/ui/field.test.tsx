// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field, Checkbox, Select } from "@/components/field";

describe("Field", () => {
  it("lie l'erreur au champ par aria-describedby", () => {
    render(
      <Field label="E-mail" error="Adresse invalide.">
        <input id="email" name="email" />
      </Field>,
    );
    const input = screen.getByLabelText("E-mail");
    const errorId = input.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    const errorEl = document.getElementById(errorId as string);
    expect(errorEl).toHaveTextContent("Adresse invalide.");
  });

  it("affiche le hint quand il n'y a pas d'erreur", () => {
    render(
      <Field label="Code" hint="8 caractères">
        <input id="code" name="code" />
      </Field>,
    );
    expect(screen.getByText("8 caractères")).toBeInTheDocument();
  });

  it("n'ajoute pas aria-describedby sans erreur ni hint", () => {
    render(
      <Field label="Nom">
        <input id="nom" name="nom" />
      </Field>,
    );
    expect(screen.getByLabelText("Nom")).not.toHaveAttribute("aria-describedby");
  });
});

describe("Checkbox", () => {
  it("affiche le libellé et coche l'état", () => {
    render(<Checkbox label="J'accepte les CGU" checked readOnly />);
    const el = screen.getByRole("checkbox", { name: "J'accepte les CGU" });
    expect(el).toBeChecked();
  });
});

describe("Select", () => {
  it("affiche le libellé et les options", () => {
    render(
      <Select
        label="Contrat"
        options={[
          { value: "stage", label: "Stage" },
          { value: "alternance", label: "Alternance" },
        ]}
      />,
    );
    const el = screen.getByLabelText("Contrat");
    expect(el.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Stage" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alternance" })).toBeInTheDocument();
  });
});
