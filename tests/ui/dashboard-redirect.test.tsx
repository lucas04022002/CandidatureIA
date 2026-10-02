import { beforeEach, describe, expect, it, vi } from "vitest";

// Le tableau de bord est réservé à l'étudiant. Le responsable y arrivait après son inscription et
// à chaque connexion (`/dashboard` est la destination par défaut de /login) : il doit repartir vers
// /organisme, où se trouve le code à donner à sa promo.
const session = vi.hoisted(() => ({ current: null as null | { id: string; email: string; role: string; organisationId: string | null } }));

vi.mock("@/lib/auth/session", () => ({ getSession: async () => session.current }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import DashboardPage from "@/app/(app)/dashboard/page";

beforeEach(() => {
  session.current = null;
});

describe("tableau de bord : un point d'arrivée par rôle", () => {
  it("renvoie le responsable vers son organisme", async () => {
    session.current = { id: "u1", email: "resp@ex.fr", role: "responsable", organisationId: "o1" };
    await expect(DashboardPage()).rejects.toThrow("REDIRECT:/organisme");
  });

  it("renvoie l'admin vers l'administration", async () => {
    session.current = { id: "u2", email: "admin@ex.fr", role: "admin", organisationId: null };
    await expect(DashboardPage()).rejects.toThrow("REDIRECT:/admin");
  });

  it("renvoie un visiteur sans session vers la connexion", async () => {
    await expect(DashboardPage()).rejects.toThrow("REDIRECT:/login");
  });
});
