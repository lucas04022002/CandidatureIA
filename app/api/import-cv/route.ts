import { assertSameOrigin, handle, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { checkImportQuota } from "@/lib/rate-limit";
import { recordCvImport } from "@/lib/db/queries/quotas";
import { upsertProfile } from "@/lib/db/queries/profiles";
import { getJobRows, updateJobScore } from "@/lib/db/queries/jobs";
import { parseCandidateProfileFromCv } from "@/lib/cv-parser";
import { scoreJob } from "@/lib/scoring/job-scoring";

export const runtime = "nodejs";

const MAX_CV_BYTES = 5 * 1024 * 1024;

interface UploadedFileLike {
  name: string;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

async function extractTextFromFile(file: UploadedFileLike) {
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });

      try {
        const parsed = await parser.getText();
        const text = parsed.text.trim();
        if (text) {
          return text;
        }
      } finally {
        try {
          await parser.destroy();
        } catch {
          // Certains PDF déclenchent une erreur de nettoyage dans pdf.js : on privilégie le texte extrait.
        }
      }
    } catch (error) {
      const fallbackText = await extractPdfTextWithPdf2Json(buffer);
      if (fallbackText) {
        return fallbackText;
      }

      throw error;
    }
  }

  return buffer.toString("utf8").trim();
}

async function extractPdfTextWithPdf2Json(buffer: Buffer) {
  const { default: PDFParser } = await import("pdf2json");

  return await new Promise<string>((resolve, reject) => {
    const parser = new PDFParser(null, true);

    parser.on("pdfParser_dataReady", () => {
      try {
        resolve(parser.getRawTextContent().trim());
      } catch (error) {
        reject(error);
      } finally {
        parser.destroy();
      }
    });

    parser.on("pdfParser_dataError", (error) => {
      try {
        const parserError = "parserError" in error ? error.parserError : error;
        reject(parserError);
      } finally {
        parser.destroy();
      }
    });

    try {
      parser.parseBuffer(buffer);
    } catch (error) {
      parser.destroy();
      reject(error);
    }
  });
}

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await checkImportQuota(user.id);

  // Garde avant lecture du corps : évite de matérialiser un envoi manifestement trop gros.
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CV_BYTES) {
    return json({ ok: false, error: "Le CV dépasse la taille maximale de 5 Mo." }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("cv");

  if (
    !file ||
    typeof file !== "object" ||
    !("name" in file) ||
    !("arrayBuffer" in file) ||
    typeof file.arrayBuffer !== "function"
  ) {
    return json({ ok: false, error: "Fichier CV manquant." }, { status: 400 });
  }

  if (!("size" in file) || typeof file.size !== "number") {
    return json({ ok: false, error: "Fichier CV illisible : taille inconnue." }, { status: 400 });
  }

  if (file.size > MAX_CV_BYTES) {
    return json({ ok: false, error: "Le CV dépasse la taille maximale de 5 Mo." }, { status: 400 });
  }

  const uploadName = String(file.name).toLowerCase();
  const uploadType = "type" in file ? String(file.type) : "";
  const isPdf = uploadType === "application/pdf" || uploadName.endsWith(".pdf");
  const isText = uploadType.startsWith("text/") || uploadName.endsWith(".txt") || uploadName.endsWith(".md");
  if (!isPdf && !isText) {
    return json(
      { ok: false, error: "Format non supporté : utilise un CV en PDF ou en texte brut." },
      { status: 400 },
    );
  }

  await recordCvImport(user.id);

  let rawText = "";
  try {
    rawText = await extractTextFromFile(file as UploadedFileLike);
  } catch (error) {
    return json(
      { ok: false, error: `Impossible de lire le CV: ${error instanceof Error ? error.message : "erreur inconnue"}` },
      { status: 400 },
    );
  }

  if (!rawText) {
    return json({ ok: false, error: "Le CV est vide ou illisible." }, { status: 400 });
  }

  const profile = parseCandidateProfileFromCv(rawText);

  const row = await upsertProfile(user.id, {
    fileName: String(file.name),
    rawText,
    fullName: profile.fullName,
    role: profile.role,
    targetRole: profile.targetRole || profile.role,
    preferredKeywords: profile.preferredKeywords.length ? profile.preferredKeywords : [profile.role],
    location: profile.location,
    email: profile.email,
    phone: profile.phone,
    github: profile.github,
    linkedin: profile.linkedin,
    summary: profile.summary,
    technicalSkills: profile.technicalSkills,
    softSkills: profile.softSkills,
    experienceHighlights: profile.experienceHighlights,
  });

  const jobs = await getJobRows(user.id);
  let rescored = 0;

  for (const job of jobs) {
    const scoring = await scoreJob(
      {
        title: job.title,
        company: job.company,
        location: job.location,
        contract: job.contract,
        source: job.source,
        description: job.jobDescription,
      },
      { mode: "heuristic", allowOpenAI: false, candidateProfile: profile },
    );

    if (scoring.score !== job.score && (await updateJobScore(user.id, job.id, scoring.score))) {
      rescored += 1;
    }
  }

  return json({
    ok: true,
    message: "CV importe et compatibilite recalculee.",
    rescored,
    profile,
    profileId: row.id,
  });
});
