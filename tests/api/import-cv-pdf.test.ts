import { beforeAll, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { organisations } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { createOrganisation, registerTraineeWithCode } from "@/lib/db/queries/organisations";
import { getProfile } from "@/lib/db/queries/profiles";

const mockCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
  }),
}));

const { POST: importCv } = await import("@/app/api/import-cv/route");
const { SESSION_COOKIE } = await import("@/lib/auth/session");

function formRequest(path: string, form: FormData) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { host: "localhost", "sec-fetch-site": "same-origin" },
    body: form,
  });
}

function toLatin1Bytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return bytes;
}

// Construit un PDF minimal mais valide (catalogue, une page, une police, un flux de contenu avec un
// seul Tj), avec une table xref dont les offsets sont calculés (pas codés en dur), pour que pdf.js le
// parse sans avoir à reconstruire la table de références.
function buildMinimalPdf(text: string): Uint8Array {
  const escaped = text.replace(/([()\\])/g, "\\$1");
  const stream = `BT /F1 18 Tf 20 250 Td (${escaped}) Tj ET`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((content, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${content}\nendobj\n`;
  });

  const xrefStart = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return toLatin1Bytes(body + xref + trailer);
}

describe("import CV au format PDF", () => {
  let userId = "";

  beforeAll(async () => {
    await resetDatabase();
    const org = await createOrganisation({ name: "Organisme PDF" });
    await db.update(organisations).set({ active: true, seats: 5 }).where(eq(organisations.id, org.id));
    const user = await registerTraineeWithCode({
      email: "pdf@exemple.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      code: org.code,
    });
    userId = user.id;
    mockCookies.set(SESSION_COOKIE, await signSession({ userId: user.id, role: "etudiant" }));
  });

  it("extrait le texte d'un PDF et enregistre le profil correspondant", async () => {
    const pdfText = "Morgane Exemple Developpeuse backend Paris";
    const pdfBytes = buildMinimalPdf(pdfText);

    const form = new FormData();
    form.append("cv", new File([pdfBytes.slice().buffer], "cv.pdf", { type: "application/pdf" }));

    const res = await importCv(formRequest("/api/import-cv", form), {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const profile = await getProfile(userId);
    expect(profile?.rawText).toContain("Morgane Exemple");
  });
});
