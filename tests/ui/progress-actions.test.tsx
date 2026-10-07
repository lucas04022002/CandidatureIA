// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Toast } from "@/components/toast";
import { FoundCompanyAction, SharePrompt, ShareSetting } from "@/components/actions/progress-actions";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

function stubFetch() {
  const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  vi.stubGlobal("fetch", f);
  return f;
}

function sentBody(f: ReturnType<typeof stubFetch>) {
  const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("/api/account/progress");
  return JSON.parse(init.body as string);
}

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("partage d'avancement — côté étudiant", () => {
  it("l'encart explique ce qui est partagé et envoie l'accord", async () => {
    const f = stubFetch();
    render(<Toast><SharePrompt /></Toast>);
    expect(screen.getByText(/Jamais le contenu/)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Oui, partager" })));
    expect(sentBody(f)).toEqual({ shareProgress: true });
    expect(refresh).toHaveBeenCalled();
  });

  it("l'encart envoie le refus", async () => {
    const f = stubFetch();
    render(<Toast><SharePrompt /></Toast>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Non" })));
    expect(sentBody(f)).toEqual({ shareProgress: false });
  });

  it("le réglage du profil propose de retirer un accord donné", async () => {
    const f = stubFetch();
    render(<Toast><ShareSetting shareProgress /></Toast>);
    expect(screen.getByText("Tu partages ton avancement avec ton organisme.")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Ne plus partager" })));
    expect(sentBody(f)).toEqual({ shareProgress: false });
  });

  it("le réglage du profil propose de partager si ce n'est pas le cas", async () => {
    const f = stubFetch();
    render(<Toast><ShareSetting shareProgress={null} /></Toast>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Partager" })));
    expect(sentBody(f)).toEqual({ shareProgress: true });
  });

  it("« J'ai trouvé mon entreprise » envoie la déclaration", async () => {
    const f = stubFetch();
    render(<Toast><FoundCompanyAction foundCompanyAt={null} /></Toast>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "J'ai trouvé mon entreprise" })));
    expect(sentBody(f)).toEqual({ foundCompany: true });
  });

  it("une fois déclarée, la date s'affiche et l'annulation est possible", async () => {
    const f = stubFetch();
    render(<Toast><FoundCompanyAction foundCompanyAt="2026-10-05T09:00:00.000Z" /></Toast>);
    expect(screen.getByText("Entreprise trouvée le 5 oct.")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Annuler" })));
    expect(sentBody(f)).toEqual({ foundCompany: false });
  });

  it("une erreur de l'API s'affiche", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ ok: false, error: "Accès refusé" }) })));
    render(<Toast><SharePrompt /></Toast>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Oui, partager" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Accès refusé");
  });
});
