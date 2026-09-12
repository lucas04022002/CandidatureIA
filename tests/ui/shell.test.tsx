// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Shell } from "@/components/shell";
import type { SessionUser } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/jwt";

// `Shell` est un composant client : il lit le chemin courant pour souligner le lien actif, refermer
// le menu mobile après une navigation, et pousse vers /login après la déconnexion. Hors application
// Next, ces hooks n'ont pas de contexte. `nav.pathname` est mutable pour simuler une navigation.
const nav = vi.hoisted(() => ({ pathname: "/jobs" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  nav.pathname = "/jobs";
});

function user(role: Role): SessionUser {
  return { id: "u1", email: "camille.test@mail.fr", role, organisationId: role === "stagiaire" ? "o1" : null };
}

// La barre est rendue deux fois (desktop + menu `<details>` mobile) : on compte les occurrences
// plutôt que d'exiger un élément unique, sinon le test casserait sur la seule duplication.
function linkCount(name: string) {
  return screen.queryAllByRole("link", { name }).length;
}

const TRAINEE_LINKS = ["Tableau de bord", "Offres", "Candidatures", "Suivi", "Profil"];
const MANAGER_LINKS = ["Mon organisme", "Profil"];
const ADMIN_LINKS = ["Admin", "Profil"];
const ALL_LINKS = ["Tableau de bord", "Offres", "Candidatures", "Suivi", "Profil", "Mon organisme", "Admin"];

describe("Shell — liens selon le rôle", () => {
  it("stagiaire : Tableau de bord, Offres, Candidatures, Suivi, Profil et rien d'autre", () => {
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

  it("le menu mobile se referme après une navigation", () => {
    const { container, rerender } = render(
      <Shell user={user("stagiaire")}>
        <p>contenu</p>
      </Shell>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    details.open = true;

    // Le `<details>` natif ne se referme pas tout seul quand le lien qu'il contient navigue :
    // sans l'effet du Shell, le panneau resterait ouvert par-dessus la page d'arrivée.
    nav.pathname = "/profil";
    rerender(
      <Shell user={user("stagiaire")}>
        <p>contenu</p>
      </Shell>,
    );
    expect(details.open).toBe(false);
  });

  it("marque la page courante dans les deux menus, desktop et mobile", () => {
    render(
      <Shell user={user("stagiaire")}>
        <p>contenu</p>
      </Shell>,
    );
    const current = screen.getAllByRole("link", { name: "Offres" });
    expect(current).toHaveLength(2);
    for (const link of current) expect(link).toHaveAttribute("aria-current", "page");
    for (const link of screen.getAllByRole("link", { name: "Profil" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
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

describe("Shell — lien d'évitement", () => {
  it("premier élément focalisable de l'en-tête, il pointe sur le <main>", () => {
    const { container } = render(
      <Shell user={user("stagiaire")}>
        <p>contenu</p>
      </Shell>,
    );

    const link = screen.getByRole("link", { name: "Aller au contenu" });
    expect(link).toHaveAttribute("href", "#contenu");

    // « Premier » au sens du clavier : c'est bien le premier lien rencontré dans l'en-tête,
    // avant la marque et les liens de navigation — sinon il n'évite rien.
    const header = container.querySelector("header") as HTMLElement;
    expect(header.querySelector("a")).toBe(link);

    // La cible existe vraiment : un lien d'évitement qui pointe dans le vide est pire que rien.
    const main = container.querySelector("main") as HTMLElement;
    expect(main).toHaveAttribute("id", "contenu");
    expect(container.querySelector("#contenu")).toBe(main);
  });

  it("caché à l'œil, rendu visible au focus (et non `hidden`, qui le sortirait du parcours)", () => {
    render(
      <Shell user={user("stagiaire")}>
        <p>contenu</p>
      </Shell>,
    );
    const link = screen.getByRole("link", { name: "Aller au contenu" });
    const classes = link.className.split(/\s+/);
    expect(classes).toContain("sr-only");
    expect(classes).toContain("focus:not-sr-only");
  });
});
