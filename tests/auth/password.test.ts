import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
describe("mot de passe", () => {
  it("hache en argon2id et vérifie", async () => {
    const h = await hashPassword("motdepasse-solide");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(h).toContain("m=19456,t=2,p=1"); // paramètres OWASP (base)
    expect(await verifyPassword(h, "motdepasse-solide")).toBe(true);
    expect(await verifyPassword(h, "autre")).toBe(false);
  });
});
