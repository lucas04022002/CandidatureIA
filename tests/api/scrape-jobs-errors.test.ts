import { beforeAll, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../setup-db";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { createUser } from "@/lib/db/queries/users";

const mockCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
  }),
}));

// Registre fictif : `scrapeAll` renvoie ce que le test a posé dans `etat`, pour fabriquer à volonté
// une source en échec avec un message technique détaillé.
const etat = vi.hoisted(() => ({
  jobs: [] as unknown[],
  sources: [] as { key: string; count: number; error?: string }[],
}));

vi.mock("@/lib/scrapers/registry", () => {
  const entry = (key: string, label: string) => ({
    key,
    label,
    isConfigured: () => true,
    enabled: () => true,
    scrape: async () => [],
  });
  return {
    SCRAPERS: [
      entry("france-travail", "France Travail"),
      entry("la-bonne-alternance", "La bonne alternance"),
      entry("test", "Test"),
    ],
    // Au moins une source active : sans cela la route répond 503 « aucune source configurée »
    // avant même d'appeler scrapeAll, et ces tests ne verraient jamais les erreurs de source.
    activeScrapers: () => [entry("test", "Test")],
    scrapeAll: async () => ({ jobs: etat.jobs, sources: etat.sources }),
  };
});

const { POST: scrapeJobs } = await import("@/app/api/scrape-jobs/route");
const { SESSION_COOKIE } = await import("@/lib/auth/session");

// Le message exact que produit lib/scrapers/france-travail.ts quand l'obtention du jeton échoue :
// URL interne, mode d'authentification, scope, code HTTP et un extrait brut de la réponse de l'API.
const ERREUR_DETAILLEE =
  'Jeton France Travail refusé — url=https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire ' +
  'auth=basic scope="api_offresdemploiv2 o2dsoffre" status=401 body={"error":"invalid_client","error_description":"client secret ABCD1234 inconnu"}';

let compteur = 0;

// Chaque appel consomme le quota de recherche (1/heure) : un utilisateur neuf par test.
async function nouvelUtilisateur() {
  compteur += 1;
  const user = await createUser({
    email: `scrape-erreur-${compteur}@ex.fr`,
    passwordHash: await hashPassword("motdepasse-correct"),
    role: "etudiant",
    organisationId: null,
  });
  mockCookies.set(SESSION_COOKIE, await signSession({ userId: user.id, role: "etudiant" }));
  return user.id;
}

function requete() {
  return new Request("http://localhost/api/scrape-jobs", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost", "sec-fetch-site": "same-origin" },
    body: JSON.stringify({ keywords: "developpeur" }),
  });
}

describe("scrape-jobs — les détails techniques ne sortent pas côté client", () => {
  beforeAll(resetDatabase);

  it("une source en échec donne un message générique, jamais url= ni body=", async () => {
    await nouvelUtilisateur();
    etat.jobs = [];
    etat.sources = [
      { key: "france-travail", count: 0, error: ERREUR_DETAILLEE },
      { key: "test", count: 0 },
    ];

    const erreurs: unknown[] = [];
    const espion = vi.spyOn(console, "error").mockImplementation((...args) => {
      erreurs.push(args.join(" "));
    });

    let brut = "";
    try {
      const res = await scrapeJobs(requete(), {});
      expect(res.status).toBe(200);
      brut = JSON.stringify(await res.json());
    } finally {
      espion.mockRestore();
    }

    // Rien de technique dans la réponse.
    expect(brut).not.toContain("url=");
    expect(brut).not.toContain("body=");
    expect(brut).not.toContain("status=");
    expect(brut).not.toContain("invalid_client");
    expect(brut).not.toContain("ABCD1234");
    expect(brut).not.toContain("francetravail.fr");

    // Mais l'utilisateur sait quelle source est tombée.
    expect(brut).toContain("France Travail");
    expect(brut.toLowerCase()).toContain("indisponible");

    // Et le détail complet est bien allé dans les logs serveur.
    const journal = erreurs.join("\n");
    expect(journal).toContain("url=");
    expect(journal).toContain("body=");
    expect(journal).toContain("France Travail");
  });

  it("même quand AUCUNE source ne répond (502), le détail reste côté serveur", async () => {
    await nouvelUtilisateur();
    etat.jobs = [];
    etat.sources = [{ key: "france-travail", count: 0, error: ERREUR_DETAILLEE }];

    const espion = vi.spyOn(console, "error").mockImplementation(() => {});
    let brut = "";
    try {
      const res = await scrapeJobs(requete(), {});
      expect(res.status).toBe(502);
      brut = JSON.stringify(await res.json());
    } finally {
      espion.mockRestore();
    }

    expect(brut).not.toContain("url=");
    expect(brut).not.toContain("body=");
    expect(brut).not.toContain("invalid_client");
  });

  // Les motifs « sans intérêt » (source non configurée, zéro résultat) ne remontent pas du tout.
  // Le filtrage passe par une normalisation qui retire les accents : « importé » doit devenir
  // « importe » pour que la règle s'applique (cf. /[\u0300-\u036f]/g dans la route).
  it("les motifs sans intérêt sont tus, accents compris (« importé » → « importe »)", async () => {
    await nouvelUtilisateur();
    etat.jobs = [];
    etat.sources = [
      { key: "france-travail", count: 0, error: "Recruteur potentiel « Alpha SA » non importé." },
      { key: "test", count: 0 },
    ];

    const espion = vi.spyOn(console, "error").mockImplementation(() => {});
    let payload: { sourceErrors: string[] };
    try {
      const res = await scrapeJobs(requete(), {});
      expect(res.status).toBe(200);
      payload = await res.json();
    } finally {
      espion.mockRestore();
    }

    expect(payload.sourceErrors).toEqual([]);
  });
});
