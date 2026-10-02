// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RegisterOrganisationForm } from "@/components/forms/register-organisation-form";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RegisterOrganisationForm — après la création", () => {
  it("annonce un organisme prêt, puis ouvre l'espace organisme", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 201,
        json: async () => ({ role: "responsable", organisation: { code: "K7MZ4P2R", active: true }, message: "Organisme créé : votre code vous attend." }),
      })),
    );
    render(<RegisterOrganisationForm />);
    fill("Nom de l'organisme", "Greta Rhône");
    fill("E-mail du responsable", "resp@greta.fr");
    fill("Mot de passe", "0123456789");
    fireEvent.click(screen.getByRole("checkbox"));

    await act(async () => {
      fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    });

    // L'organisme est actif dès sa création : rien ne doit laisser croire qu'il attend une validation.
    const notice = screen.getByRole("status");
    expect(notice.textContent).not.toMatch(/validation|activé après/i);

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(push).toHaveBeenCalledWith("/organisme");
  });
});
