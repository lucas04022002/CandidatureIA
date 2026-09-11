import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase } from "../setup-db";
import { hashPassword } from "@/lib/auth/password";
import { createUser } from "@/lib/db/queries/users";
import { backfillJobs, getJobRows, insertJobs, safeJobUrl } from "@/lib/db/queries/jobs";

function offre(title: string, jobUrl: string | null) {
  return {
    title,
    company: "Alpha",
    location: "Paris",
    contract: "CDI",
    source: "Test",
    jobUrl,
    jobDescription: null,
    score: 50,
  };
}

// `jobUrl` vient d'une API externe et finit dans un `href` cliquable côté client. Une URL
// `javascript:` ou `data:` y devient du code exécuté dans la session de l'utilisateur au moment du
// clic : XSS stockée. Seul http(s) est conservé, tout le reste est ramené à null (le lien
// disparaît, l'offre reste).
describe("assainissement de jobUrl", () => {
  describe("safeJobUrl", () => {
    it("conserve http et https", () => {
      expect(safeJobUrl("https://exemple.test/offre/1")).toBe("https://exemple.test/offre/1");
      expect(safeJobUrl("http://exemple.test/offre/2")).toBe("http://exemple.test/offre/2");
      expect(safeJobUrl("  https://exemple.test/offre/3  ")).toBe("https://exemple.test/offre/3");
    });

    it("rejette javascript: et data:", () => {
      expect(safeJobUrl("javascript:alert(1)")).toBeNull();
      expect(safeJobUrl("JavaScript:alert(1)")).toBeNull();
      expect(safeJobUrl("  javascript:alert(document.cookie)")).toBeNull();
      expect(safeJobUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBeNull();
    });

    it("rejette les autres protocoles et ce qui n'est pas une URL", () => {
      expect(safeJobUrl("file:///etc/passwd")).toBeNull();
      expect(safeJobUrl("vbscript:msgbox(1)")).toBeNull();
      expect(safeJobUrl("/offre/relative")).toBeNull();
      expect(safeJobUrl("pas une url")).toBeNull();
      expect(safeJobUrl(null)).toBeNull();
      expect(safeJobUrl("")).toBeNull();
    });
  });

  describe("en base", () => {
    let userId = "";

    beforeAll(async () => {
      await resetDatabase();
      const user = await createUser({
        email: "url@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        role: "stagiaire",
        organisationId: null,
      });
      userId = user.id;
    });

    it("insertJobs n'écrit jamais une URL non http(s)", async () => {
      await insertJobs(userId, [
        offre("Offre piegee", "javascript:alert(1)"),
        offre("Offre data", "data:text/html,<script>alert(1)</script>"),
        offre("Offre saine", "https://exemple.test/offre"),
      ]);

      const rows = await getJobRows(userId);
      const parTitre = new Map(rows.map((row) => [row.title, row.jobUrl]));
      expect(parTitre.get("Offre piegee")).toBeNull();
      expect(parTitre.get("Offre data")).toBeNull();
      expect(parTitre.get("Offre saine")).toBe("https://exemple.test/offre");
    });

    it("backfillJobs n'en réintroduit pas une non plus", async () => {
      const rows = await getJobRows(userId);
      const saine = rows.find((row) => row.title === "Offre saine")!;

      await backfillJobs(userId, [
        {
          id: saine.id,
          source: "Test",
          sourceLabels: ["Test"],
          jobUrl: "javascript:alert(1)",
          jobDescription: null,
        },
      ]);

      const relue = (await getJobRows(userId)).find((row) => row.id === saine.id);
      expect(relue?.jobUrl).toBeNull();
    });
  });
});
