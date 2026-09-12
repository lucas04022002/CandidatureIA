// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApplicationStatusActions } from "@/components/actions/application-status";
import { Toast } from "@/components/toast";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const APPLICATION_ID = "6f1f2d2c-2f9f-4a3a-9b1f-1f0f6a2a1b11";

function stubFetch() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, message: "Candidature marquée envoyée." }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ApplicationStatusActions", () => {
  it("« Marquer envoyée » envoie exactement { applicationId, status: \"Envoyé\" }", async () => {
    const fetchMock = stubFetch();
    render(
      <Toast>
        <ApplicationStatusActions applicationId={APPLICATION_ID} status="Brouillon" />
      </Toast>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Marquer envoyée" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/update-application-status");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      applicationId: APPLICATION_ID,
      status: "Envoyé",
    });
  });

  it("« Marquer refusée » envoie le statut Refusé sur la même route", async () => {
    const fetchMock = stubFetch();
    render(
      <Toast>
        <ApplicationStatusActions applicationId={APPLICATION_ID} status="Envoyé" />
      </Toast>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Marquer refusée" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/update-application-status");
    expect(JSON.parse(String(init.body))).toEqual({
      applicationId: APPLICATION_ID,
      status: "Refusé",
    });
  });

  it("« Supprimer » demande confirmation avant d'appeler /api/delete-application", async () => {
    const fetchMock = stubFetch();
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmMock);

    render(
      <Toast>
        <ApplicationStatusActions applicationId={APPLICATION_ID} status="Envoyé" />
      </Toast>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
