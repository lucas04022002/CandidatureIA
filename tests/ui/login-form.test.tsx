// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginForm } from "@/components/forms/login-form";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/login",
}));

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit() {
  const form = document.querySelector("form") as HTMLFormElement;
  fireEvent.submit(form);
}

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginForm — onglet inscription", () => {
  it("expose l'onglet actif par aria-pressed, sans rôle ARIA d'onglet", () => {
    // Deux boutons, pas un vrai motif « tablist » : sans tabindex mobile ni navigation aux flèches,
    // annoncer role="tab" promettrait au lecteur d'écran un clavier qui n'existe pas.
    render(<LoginForm />);
    const signin = screen.getByRole("button", { name: "Connexion" });
    const signup = screen.getByRole("button", { name: "Inscription" });
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(signin).toHaveAttribute("aria-pressed", "true");
    expect(signup).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(signup);
    expect(signup).toHaveAttribute("aria-pressed", "true");
    expect(signin).toHaveAttribute("aria-pressed", "false");
  });

  it("montre le code d'organisme en mono majuscules, limité à 8 caractères, et la case CGU", () => {
    render(<LoginForm />);
    expect(screen.queryByLabelText("Code d'organisme")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Inscription" }));

    const code = screen.getByLabelText("Code d'organisme") as HTMLInputElement;
    expect(code).toHaveAttribute("maxLength", "8");
    const classes = code.className.split(/\s+/);
    expect(classes).toContain("font-mono");
    expect(classes).toContain("uppercase");
    expect(classes).toContain("tracking-[0.2em]");

    const cgu = screen.getByRole("checkbox");
    expect(cgu).toBeRequired();
    expect(screen.getByRole("link", { name: "conditions d'utilisation" })).toHaveAttribute("href", "/cgu");
    expect(screen.getByText("10 caractères minimum.")).toBeInTheDocument();
  });

  it("met le code en majuscules à la saisie", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Inscription" }));
    const code = screen.getByLabelText("Code d'organisme") as HTMLInputElement;
    fireEvent.change(code, { target: { value: "k7mz4p2r" } });
    expect(code.value).toBe("K7MZ4P2R");
  });
});

describe("LoginForm — erreurs de l'API", () => {
  it("affiche la phrase d'aide quand l'API renvoie « Code d'organisme inconnu »", async () => {
    mockFetch(400, { error: "Code d'organisme inconnu" });
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Inscription" }));
    fill("E-mail", "camille.test@mail.fr");
    fill("Mot de passe", "motdepasse10");
    fill("Code d'organisme", "K7MZ4P2R");
    fireEvent.click(screen.getByRole("checkbox"));
    submit();

    await waitFor(() => {
      expect(
        screen.getByText("Code d'organisme inconnu. Vérifie les 8 caractères avec ton formateur."),
      ).toBeInTheDocument();
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("affiche telle quelle toute autre erreur renvoyée par l'API", async () => {
    mockFetch(401, { error: "E-mail ou mot de passe incorrect" });
    render(<LoginForm />);
    fill("E-mail", "camille.test@mail.fr");
    fill("Mot de passe", "motdepasse10");
    submit();

    await waitFor(() => {
      expect(screen.getByText("E-mail ou mot de passe incorrect")).toBeInTheDocument();
    });
  });
});

describe("LoginForm — corps envoyés à l'API", () => {
  it("connexion : POST /api/auth/login avec { email, password }", async () => {
    const fetchMock = mockFetch(200, {});
    render(<LoginForm />);
    fill("E-mail", "camille.test@mail.fr");
    fill("Mot de passe", "motdepasse10");
    submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/login");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "camille.test@mail.fr",
      password: "motdepasse10",
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("inscription : POST /api/auth/register avec { email, password, orgCode, acceptedTerms }", async () => {
    const fetchMock = mockFetch(201, {});
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Inscription" }));
    fill("E-mail", "camille.test@mail.fr");
    fill("Mot de passe", "motdepasse10");
    fill("Code d'organisme", "K7MZ4P2R");
    fireEvent.click(screen.getByRole("checkbox"));
    submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/register");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "camille.test@mail.fr",
      password: "motdepasse10",
      orgCode: "K7MZ4P2R",
      acceptedTerms: true,
    });
  });
});
