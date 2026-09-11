import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next";

// Le paramètre `next` de /login vient de l'URL : n'importe qui peut envoyer à une victime un lien
// /login?next=https://evil.tld. Sans filtrage, la redirection post-connexion l'emmène sur un site
// tiers qui peut se faire passer pour ApplyBot (open redirect, base d'un hameçonnage crédible :
// l'utilisateur a bien commencé sur le vrai domaine).
describe("safeNextPath", () => {
  it("laisse passer un chemin interne", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/applications/123")).toBe("/applications/123");
    expect(safeNextPath("/jobs?source=Test")).toBe("/jobs?source=Test");
  });

  it("refuse une URL absolue", () => {
    expect(safeNextPath("https://evil")).toBe("/dashboard");
    expect(safeNextPath("http://evil.tld/phishing")).toBe("/dashboard");
  });

  it("refuse une URL protocol-relative (//evil)", () => {
    expect(safeNextPath("//evil")).toBe("/dashboard");
    expect(safeNextPath("//evil.tld/login")).toBe("/dashboard");
  });

  it("refuse un pseudo-protocole exécutable", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNextPath("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
  });

  it("refuse tout ce qui ne commence pas par « / »", () => {
    expect(safeNextPath("evil.tld")).toBe("/dashboard");
    expect(safeNextPath("dashboard")).toBe("/dashboard");
  });

  // Variante de `//evil` que certains navigateurs normalisent en protocol-relative.
  it("refuse la contre-barre (/\evil)", () => {
    expect(safeNextPath("/\\evil")).toBe("/dashboard");
    expect(safeNextPath("\\\\evil")).toBe("/dashboard");
  });

  it("retombe sur /dashboard quand le paramètre est absent ou vide", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });
});
