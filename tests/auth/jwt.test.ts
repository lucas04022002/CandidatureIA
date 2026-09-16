import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/auth/jwt";
describe("jeton de session", () => {
  it("signe et relit", async () => {
    const t = await signSession({ userId: "u1", role: "etudiant" });
    expect(await verifySession(t)).toEqual({ userId: "u1", role: "etudiant" });
  });
  it("refuse un jeton altéré", async () => { expect(await verifySession("a.b.c")).toBeNull(); });
});
