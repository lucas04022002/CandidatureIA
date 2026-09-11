import { describe, expect, it } from "vitest";
import { config } from "@/proxy";

// Le `matcher` décide quelles requêtes traversent proxy.ts. Sans exclusion des fichiers statiques
// de public/, une requête non authentifiée sur /globe.svg est redirigée vers /login : l'image
// renvoie une page HTML, et la page de connexion elle-même perd ses illustrations.
const pattern = new RegExp(`^${config.matcher[0]}$`);

describe("matcher du proxy", () => {
  it("laisse passer les fichiers statiques de public/ (pas de redirection)", () => {
    for (const path of ["/globe.svg", "/file.svg", "/next.svg", "/window.svg", "/vercel.svg"]) {
      expect(pattern.test(path), path).toBe(false);
    }
  });

  it("laisse passer les fichiers servis à la racine et les assets Next", () => {
    for (const path of [
      "/robots.txt",
      "/sitemap.xml",
      "/favicon.ico",
      "/logo.png",
      "/photo.jpeg",
      "/_next/static/chunks/main.js",
      "/_next/image",
    ]) {
      expect(pattern.test(path), path).toBe(false);
    }
  });

  it("intercepte bien les pages de l'application", () => {
    for (const path of ["/dashboard", "/jobs", "/applications/abc", "/organisme", "/admin", "/"]) {
      expect(pattern.test(path), path).toBe(true);
    }
  });

  // Un chemin qui contient « .svg » sans finir par là reste une page à protéger.
  it("n'est pas trompé par une extension au milieu du chemin", () => {
    expect(pattern.test("/applications/globe.svg.json")).toBe(true);
  });
});
