import { NextResponse } from "next/server";
import { parseCandidateProfileFromCv } from "@/lib/cv-parser";
import { scoreJob } from "@/lib/scoring/job-scoring";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  job_description: string | null;
  score: number;
}

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
          // Some PDFs trigger cleanup issues in pdf.js; prefer returning parsed text when available.
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("cv");

    if (
      !file ||
      typeof file !== "object" ||
      !("name" in file) ||
      !("arrayBuffer" in file) ||
      typeof file.arrayBuffer !== "function"
    ) {
      return NextResponse.json({ ok: false, error: "Fichier CV manquant." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase non configure cote serveur." },
        { status: 500 },
      );
    }

    let rawText = "";
    try {
      rawText = await extractTextFromFile(file as UploadedFileLike);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `Impossible de lire le CV: ${error instanceof Error ? error.message : "erreur inconnue"}`,
        },
        { status: 400 },
      );
    }

    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "Le CV est vide ou illisible." },
        { status: 400 },
      );
    }

    const profile = parseCandidateProfileFromCv(rawText);

    const { error: insertError } = await supabase.from("candidate_profiles").insert({
      id: crypto.randomUUID(),
      file_name: file.name,
      raw_text: rawText,
      full_name: profile.fullName,
      role: profile.role,
      target_role: profile.targetRole || profile.role,
      preferred_keywords: profile.preferredKeywords.length ? profile.preferredKeywords : [profile.role],
      location: profile.location,
      email: profile.email,
      phone: profile.phone,
      github: profile.github,
      linkedin: profile.linkedin,
      summary: profile.summary,
      technical_skills: profile.technicalSkills,
      soft_skills: profile.softSkills,
      experience_highlights: profile.experienceHighlights,
      updated_at: new Date().toISOString(),
    } as never);

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: `Impossible d'enregistrer le profil: ${insertError.message}` },
        { status: 500 },
      );
    }

    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select("id,title,company,location,contract,source,job_description,score");

    if (jobsError) {
      return NextResponse.json(
        {
          ok: true,
          warning: `Profil importe, mais rescoring impossible: ${jobsError.message}`,
          profile,
        },
        { status: 200 },
      );
    }

    const jobs = (jobsData ?? []) as unknown as JobRow[];
    let rescored = 0;

    for (const job of jobs) {
      const scoring = await scoreJob(
        {
          title: job.title,
          company: job.company,
          location: job.location,
          contract: job.contract,
          source: job.source,
          description: job.job_description,
        },
        { mode: "heuristic", allowOpenAI: false, candidateProfile: profile },
      );

      if (scoring.score !== job.score) {
        const { error: updateError } = await supabase
          .from("jobs")
          .update({ score: scoring.score } as never)
          .eq("id", job.id);

        if (!updateError) {
          rescored += 1;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "CV importe et compatibilite recalculee.",
      rescored,
      profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: `Erreur import CV: ${error instanceof Error ? error.message : "erreur inconnue"}`,
      },
      { status: 500 },
    );
  }
}
