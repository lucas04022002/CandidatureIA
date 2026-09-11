import { describe, expect, it, vi } from "vitest";

// Aucun cookie : `cookies()` renvoie systématiquement `undefined`, donc `getSession()` est nulle et
// `requireUser()` doit rejeter chaque route candidat avec un 401 avant toute lecture de la base.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

type RouteModule = { POST: (req: Request, ctx: unknown) => Promise<Response> };

// Imports statiques (pas de template littéral) : Vite résout chaque route à la compilation.
const ROUTES: Array<[name: string, load: () => Promise<RouteModule>]> = [
  ["import-cv", () => import("@/app/api/import-cv/route")],
  ["update-candidate-profile", () => import("@/app/api/update-candidate-profile/route")],
  ["scrape-jobs", () => import("@/app/api/scrape-jobs/route")],
  ["rescore-jobs", () => import("@/app/api/rescore-jobs/route")],
  ["generate-application", () => import("@/app/api/generate-application/route")],
  ["generate-followup", () => import("@/app/api/generate-followup/route")],
  ["update-application-status", () => import("@/app/api/update-application-status/route")],
  ["mark-job-applied", () => import("@/app/api/mark-job-applied/route")],
  ["delete-application", () => import("@/app/api/delete-application/route")],
];

describe("routes candidat sans session", () => {
  for (const [name, load] of ROUTES) {
    it(`${name} → 401`, async () => {
      const mod = await load();
      const res = await mod.POST(
        new Request(`http://localhost/api/${name}`, {
          method: "POST",
          headers: {
            host: "localhost",
            "sec-fetch-site": "same-origin",
            "content-type": "application/json",
          },
          body: "{}",
        }),
        {},
      );
      expect(res.status).toBe(401);
    });
  }
});
