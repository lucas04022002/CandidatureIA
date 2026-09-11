import { beforeAll, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../setup-db";
import { createUser } from "@/lib/db/queries/users";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";

const mockCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
  }),
}));

const { requireRole, SESSION_COOKIE } = await import("@/lib/auth/session");

describe("requireRole", () => {
  beforeAll(resetDatabase);

  it("session stagiaire appelant une route réservée aux responsables/admins → 403", async () => {
    const user = await createUser({
      email: "stagiaire-role@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "stagiaire",
      organisationId: null,
    });
    mockCookies.set(SESSION_COOKIE, await signSession({ userId: user.id, role: "stagiaire" }));

    await expect(requireRole("responsable", "admin")).rejects.toMatchObject({ status: 403 });
  });

  it("session avec le rôle attendu → autorisée", async () => {
    const user = await createUser({
      email: "admin-role@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "admin",
      organisationId: null,
    });
    mockCookies.set(SESSION_COOKIE, await signSession({ userId: user.id, role: "admin" }));

    const session = await requireRole("admin");
    expect(session.role).toBe("admin");
  });

  it("sans cookie → 401", async () => {
    mockCookies.delete(SESSION_COOKIE);
    await expect(requireRole("admin")).rejects.toMatchObject({ status: 401 });
  });
});
