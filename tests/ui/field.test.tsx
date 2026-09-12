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

  it("annonce l'erreur : le paragraphe porte role=alert", () => {
    // aria-describedby ne fait que rattacher le texte au champ : il n'est lu qu'au moment où le champ
    // prend le focus. Une erreur qui apparaît après l'envoi du formulaire passerait donc inaperçue.
    render(
      <Field label="Code d'organisme" error="Code d'organisme inconnu.">
        <input id="orgCode" name="orgCode" />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Code d'organisme inconnu.");
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

  it("génère un id quand l'enfant n'en a pas, pour que htmlFor du label résolve", () => {
    render(
      <Field label="Poste">
        <input name="poste" />
      </Field>,
    );
    const input = screen.getByLabelText("Poste");
    const label = document.querySelector("label") as HTMLLabelElement;
    expect(input.id).toBeTruthy();
    expect(label.htmlFor).toBe(input.id);
  });
});

describe("Checkbox", () => {
  it("affiche le libellé et coche l'état", () => {
    render(<Checkbox label="J'accepte les CGU" checked readOnly />);
    const el = screen.getByRole("checkbox", { name: "J'accepte les CGU" });
    expect(el).toBeChecked();
  });

  it("a une largeur de bordure en plus de la couleur (sinon Preflight ne trace aucune bordure)", () => {
    // Vérif par jeton exact plutôt que /\bborder\b/ : cette regex matche déjà "border-ink"
    // seul (le "-" crée une frontière de mot), donc elle resterait verte même sans le
    // correctif — elle ne détecterait jamais la régression qu'elle est censée garder.
    render(<Checkbox label="J'accepte les CGU" checked readOnly />);
    expect(screen.getByRole("checkbox").className.split(/\s+/)).toContain("border");
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

  it("a une largeur de bordure en plus de la couleur (sinon Preflight ne trace aucune bordure)", () => {
    // Même remarque que pour Checkbox : jeton exact, pas /\bborder\b/ (faux positif sur "border-line").
    render(<Select label="Contrat" options={[{ value: "stage", label: "Stage" }]} />);
    expect(screen.getByLabelText("Contrat").className.split(/\s+/)).toContain("border");
  });
});
