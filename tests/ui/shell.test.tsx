// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Shell } from "@/components/shell";
import type { SessionUser } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/jwt";

// `Shell` est un composant client : il lit le chemin courant pour souligner le lien actif et
// pousse vers /login après la déconnexion. Hors application Next, ces hooks n'ont pas de contexte.
vi.mock("next/navigation", () => ({
  usePathname: () => "/jobs",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function user(role: Role): SessionUser {
  return { id: "u1", email: "camille.test@mail.fr", role, organisationId: role === "stagiaire" ? "o1" : null };
}

// La barre est rendue deux fois (desktop + menu `<details>` mobile) : on compte les occurrences
// plutôt que d'exiger un élément unique, sinon le test casserait sur la seule duplication.
function linkCount(name: string) {
  return screen.queryAllByRole("link", { name }).length;
}

const TRAINEE_LINKS = ["Offres", "Candidatures", "Suivi", "Profil"];
const MANAGER_LINKS = ["Mon organisme", "Profil"];
const ADMIN_LINKS = ["Admin", "Profil"];
const ALL_LINKS = ["Offres", "Candidatures", "Suivi", "Profil", "Mon organisme", "Admin"];

describe("Shell — liens selon le rôle", () => {
  it("stagiaire : Offres, Candidatures, Suivi, Profil et rien d'autre", () => {
    render(
      <Shell user={user("stagiaire")}>
        <p>contenu</p>
      </Shell>,
    );
    for (const label of TRAINEE_LINKS) expect(linkCount(label), label).toBeGreaterThan(0);
    for (const label of ALL_LINKS.filter((l) => !TRAINEE_LINKS.includes(l))) {
      expect(linkCount(label), label).toBe(0);
    }
  });

  it("responsable : Mon organisme et Profil, pas les écrans du stagiaire ni Admin", () => {
    render(
      <Shell user={user("responsable")}>
        <p>contenu</p>
      </Shell>,
    );
    for (const label of MANAGER_LINKS) expect(linkCount(label), label).toBeGreaterThan(0);
    for (const label of ALL_LINKS.filter((l) => !MANAGER_LINKS.includes(l))) {
      expect(linkCount(label), label).toBe(0);
    }
  });

  it("admin : Admin et Profil, pas les écrans du stagiaire ni Mon organisme", () => {
    render(
      <Shell user={user("admin")}>
        <p>contenu</p>
      </Shell>,
    );
    for (const label of ADMIN_LINKS) expect(linkCount(label), label).toBeGreaterThan(0);
    for (const label of ALL_LINKS.filter((l) => !ADMIN_LINKS.includes(l))) {
      expect(linkCount(label), label).toBe(0);
    }
  });
});

describe("Shell — marque, compte et contenu", () => {
  it("affiche la marque, l'e-mail, la déconnexion, le contenu et le pied légal", () => {
    render(
      <Shell user={user("stagiaire")}>
        <p>contenu de la page</p>
      </Shell>,
    );
    expect(screen.getAllByText("ApplyBot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("camille.test@mail.fr").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Se déconnecter" }).length).toBeGreaterThan(0);
    expect(screen.getByText("contenu de la page")).toBeInTheDocument();
    expect(linkCount("Mentions légales")).toBeGreaterThan(0);
    expect(linkCount("CGU")).toBeGreaterThan(0);
    expect(screen.getByText("ApplyBot ne transmet aucune donnée à un tiers.")).toBeInTheDocument();
  });

  it("la barre est bleue et le contenu dans la colonne de lecture", () => {
    const { container } = render(
      <Shell user={user("stagiaire")}>
        <p>contenu</p>
      </Shell>,
    );
    const header = container.querySelector("header") as HTMLElement;
    expect(header.className).toContain("bg-klein");
    expect(header.className).toContain("text-white");
    const main = container.querySelector("main") as HTMLElement;
    for (const token of ["max-w-6xl", "mx-auto", "px-6", "py-8"]) {
      expect(main.className.split(/\s+/), token).toContain(token);
    }
  });
});
