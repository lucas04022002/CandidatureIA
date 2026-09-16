// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrganisationView } from "@/components/organisation-view";
import { Toast } from "@/components/toast";

// `OrganisationView` est la partie présentable de /organisme : la page serveur ne fait que la
// requête puis lui passe des données déjà lues. Les actions qu'elle contient (« Régénérer »,
// « Retirer ») sont des composants clients qui appellent `useRouter` et `useToast` — d'où le mock
// de navigation et l'enveloppe `<Toast>`, sans quoi le rendu lèverait hors application.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const MEMBERS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "camille@promo-elec.fr",
    createdAt: new Date("2026-03-02T09:00:00Z"),
    lastLoginAt: new Date("2026-09-10T07:30:00Z"),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "sofiane@promo-elec.fr",
    createdAt: new Date("2026-04-14T09:00:00Z"),
    lastLoginAt: null,
  },
];

function renderView(overrides: Partial<Parameters<typeof OrganisationView>[0]> = {}) {
  return render(
    <Toast>
      <OrganisationView
        name="Promo électricité"
        code="K7MZ4P2R"
        seats={20}
        active
        createdAt={new Date("2026-01-08T09:00:00Z")}
        members={MEMBERS}
        {...overrides}
      />
    </Toast>,
  );
}

describe("OrganisationView", () => {
  it("affiche le code d'organisme en grand", () => {
    renderView();
    const code = screen.getByText("K7MZ4P2R");
    expect(code).toBeInTheDocument();
    expect(code.className).toContain("font-display");
    expect(code.className).toContain("text-[40px]");
    expect(code.className).toContain("tracking-[0.06em]");
  });

  it("affiche les places utilisées sur les places ouvertes", () => {
    // 12 membres pour 20 places : le chiffre du haut est bien « utilisées / ouvertes », pas
    // « restantes », et il vient du nombre de lignes réellement rendues.
    const members = Array.from({ length: 12 }, (_, index) => ({
      id: `3333333${index}-3333-4333-8333-333333333333`,
      email: `étudiant${index}@promo-elec.fr`,
      createdAt: new Date("2026-03-02T09:00:00Z"),
      lastLoginAt: null,
    }));
    renderView({ members });
    expect(screen.getByText("12 / 20")).toBeInTheDocument();
    expect(screen.getByText("places utilisées")).toBeInTheDocument();
  });

  it("liste les étudiants avec leur dernière connexion et un bouton pour les retirer", () => {
    renderView();
    expect(screen.getByText("camille@promo-elec.fr")).toBeInTheDocument();
    expect(screen.getByText("sofiane@promo-elec.fr")).toBeInTheDocument();
    // Un compte qui ne s'est jamais connecté ne doit pas afficher une date vide.
    expect(screen.getByText("Jamais")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Retirer" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Régénérer" })).toBeInTheDocument();
  });

  it("sans etudiant, invite à communiquer le code plutôt que d'afficher un tableau vide", () => {
    renderView({ members: [] });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/Communiquez le code/)).toBeInTheDocument();
    expect(screen.getByText("0 / 20")).toBeInTheDocument();
  });

  it("organisme non activé : l'avertissement est annoncé", () => {
    renderView({ active: false });
    expect(screen.getByRole("status")).toHaveTextContent(/pas encore activé/i);
  });
});
