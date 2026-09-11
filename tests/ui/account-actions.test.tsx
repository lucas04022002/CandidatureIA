// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccountActions } from "@/components/forms/account-actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const EMAIL = "camille.test@mail.fr";

function stubFetch() {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function typeConfirmation(value: string) {
  fireEvent.change(screen.getByLabelText("Recopie ton adresse e-mail pour confirmer"), {
    target: { value },
  });
}

describe("AccountActions — suppression du compte", () => {
  it("e-mail faux : le bouton reste inerte, aucun appel réseau", () => {
    const fetchMock = stubFetch();
    render(<AccountActions email={EMAIL} />);

    typeConfirmation("camille@autre.fr");
    fireEvent.click(screen.getByRole("button", { name: "Supprimer mon compte" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("e-mail exact : appelle DELETE /api/account", async () => {
    const fetchMock = stubFetch();
    render(<AccountActions email={EMAIL} />);

    typeConfirmation(EMAIL);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer mon compte" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/account");
    expect(init.method).toBe("DELETE");
  });
});
