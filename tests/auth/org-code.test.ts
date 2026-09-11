import { describe, expect, it } from "vitest";
import { generateOrgCode, ORG_CODE_ALPHABET } from "@/lib/auth/org-code";
describe("code d'organisme", () => {
  it("8 caractères sans O/0/I/1", () => {
    for (let i = 0; i < 200; i++) { const c = generateOrgCode(); expect(c).toHaveLength(8); for (const ch of c) expect(ORG_CODE_ALPHABET).toContain(ch); }
    expect(ORG_CODE_ALPHABET).not.toMatch(/[O0I1]/);
  });
});
