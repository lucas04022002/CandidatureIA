// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SearchControls } from "@/components/search-controls";
import { Toast } from "@/components/toast";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace }),
  usePathname: () => "/jobs",
  useSearchParams: () => new URLSearchParams(""),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

function renderControls() {
  return render(
    <Toast>
      <SearchControls defaultKeywords="Électricien" defaultLocation="Lyon" />
    </Toast>,
  );
}

describe("SearchControls", () => {
  it("affiche le message de quota renvoyé par l'API quand la recherche est refusée (429)", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ ok: false, error: "Prochaine recherche possible à 09:30" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    renderControls();
    fireEvent.click(screen.getByRole("button", { name: "Chercher des offres" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Prochaine recherche possible à 09:30");
    });
  });

  it("envoie les champs de recherche à /api/scrape-jobs avec le corps attendu", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, message: "Recherche terminée.", sourcesUsed: ["Adzuna"] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    renderControls();
    fireEvent.change(screen.getByLabelText("Métier"), { target: { value: "Électricien" } });
    fireEvent.change(screen.getByLabelText("Lieu"), { target: { value: "Lyon" } });
    fireEvent.click(screen.getByRole("button", { name: "Chercher des offres" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/scrape-jobs");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body.keywords).toBe("Électricien");
    expect(body.location).toBe("Lyon");
    expect(Number.isInteger(body.radiusKm)).toBe(true);
    expect(Number.isInteger(body.limit)).toBe(true);
  });

  it("la touche Entrée dans un champ lance la recherche (envoi du formulaire)", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, message: "Recherche terminée." }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    renderControls();
    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("/api/scrape-jobs");
  });
});
