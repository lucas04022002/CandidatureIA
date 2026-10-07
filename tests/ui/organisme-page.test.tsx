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
    shareProgress: true,
    sentCount: 7,
    lastSentAt: new Date("2026-10-03T10:00:00Z"),
    foundCompanyAt: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "sofiane@promo-elec.fr",
    createdAt: new Date("2026-04-14T09:00:00Z"),
    lastLoginAt: null,
    shareProgress: null,
    sentCount: null,
    lastSentAt: null,
    foundCompanyAt: null,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    email: "ines@promo-elec.fr",
    createdAt: new Date("2026-04-20T09:00:00Z"),
    lastLoginAt: new Date("2026-10-05T08:00:00Z"),
    shareProgress: true,
    sentCount: 4,
    lastSentAt: new Date("2026-09-28T10:00:00Z"),
    foundCompanyAt: new Date("2026-10-05T09:00:00Z"),
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
      shareProgress: null,
      sentCount: null,
      lastSentAt: null,
      foundCompanyAt: null,
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
    expect(screen.getAllByRole("button", { name: "Retirer" })).toHaveLength(MEMBERS.length);
    expect(screen.getByRole("button", { name: "Régénérer" })).toBeInTheDocument();
  });

  it("affiche l'avancement de ceux qui partagent, et « Non partagé » sinon", () => {
    renderView();
    expect(screen.getByText("7 envoyées · dernière le 3 oct. · En recherche")).toBeInTheDocument();
    expect(screen.getByText("Entreprise trouvée le 5 oct.")).toBeInTheDocument();
    expect(screen.getByText("Non partagé")).toBeInTheDocument();
  });

  it("accorde « envoyée » au singulier et dit « 0 envoyée » sans date", () => {
    const base = MEMBERS[0];
    renderView({
      members: [
        { ...base, id: "a", email: "un@ex.fr", sentCount: 1, lastSentAt: new Date("2026-10-01T10:00:00Z") },
        { ...base, id: "b", email: "zero@ex.fr", sentCount: 0, lastSentAt: null },
      ],
    });
    expect(screen.getByText("1 envoyée · dernière le 1 oct. · En recherche")).toBeInTheDocument();
    expect(screen.getByText("0 envoyée · En recherche")).toBeInTheDocument();
  });

  it("résume les étudiants placés et ceux qui partagent", () => {
    renderView();
    expect(screen.getByText("1 a trouvé une entreprise · 2 partagent leur avancement sur 3 inscrits")).toBeInTheDocument();
  });

  it("accorde le résumé au singulier", () => {
    renderView({ members: [MEMBERS[0]] });
    expect(screen.getByText("0 a trouvé une entreprise · 1 partage son avancement sur 1 inscrit")).toBeInTheDocument();
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
