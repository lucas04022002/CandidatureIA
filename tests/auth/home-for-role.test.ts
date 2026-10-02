import { describe, expect, it } from "vitest";
import { homeForRole } from "@/lib/auth/safe-next";

// Chaque rôle a son propre point d'arrivée. Le tableau de bord est celui de l'étudiant : un
// responsable qui y atterrissait lisait « Bonjour toi — Voilà où tu en es » et un bouton « Chercher
// des offres », sans trace de son code d'organisme (02/10/2026).
describe("homeForRole", () => {
  it("envoie l'étudiant sur son tableau de bord", () => {
    expect(homeForRole("etudiant")).toBe("/dashboard");
  });

  it("envoie le responsable sur son organisme", () => {
    expect(homeForRole("responsable")).toBe("/organisme");
  });

  it("envoie l'admin sur l'administration", () => {
    expect(homeForRole("admin")).toBe("/admin");
  });
});
