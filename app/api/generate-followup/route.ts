import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getActiveCandidateProfile, type CandidateProfile } from "@/lib/candidate-profile";
import { getApplicationRow, setFollowup } from "@/lib/db/queries/applications";
import { getJobById, type JobRow } from "@/lib/db/queries/jobs";

const Body = z.object({ applicationId: z.string().uuid() });

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function asDateLabel(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildFollowupEmail(job: JobRow | null, sendDateHint: string, candidateProfile: CandidateProfile) {
  const title = job?.title ?? "votre offre";
  const company = job?.company ?? "votre entreprise";
  const location = job?.location ?? "";

  return `Bonjour,

Je me permets de revenir vers vous concernant ma candidature au poste "${title}"${location ? ` (${location})` : ""} chez ${company}.

Je reste très motivé pour rejoindre votre équipe et contribuer sur ce poste. Je suis disponible rapidement pour un échange si vous le souhaitez.

N'hésitez pas à me dire si vous avez besoin d'informations complémentaires.

Bien cordialement,
${candidateProfile.fullName}
${candidateProfile.email}
${candidateProfile.phone}

Relance conseillée à partir du ${sendDateHint}.`;
}

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const b = await readJson(req, Body);

  const application = await getApplicationRow(user.id, b.applicationId);
  if (!application) return json({ ok: false, error: "Candidature introuvable." }, { status: 404 });

  const job = await getJobById(user.id, application.jobId);
  const candidateProfile = await getActiveCandidateProfile(user.id);
  const suggestedDate = addDays(application.sentAt ?? new Date(), 4);
  const suggestedDateLabel = asDateLabel(suggestedDate);
  const followupEmailText = buildFollowupEmail(job, suggestedDateLabel, candidateProfile);

  const updated = await setFollowup(user.id, application.id, followupEmailText, suggestedDate);
  if (!updated) return json({ ok: false, error: "Candidature introuvable." }, { status: 404 });

  return json({
    ok: true,
    message: "Relance J+4 générée.",
    warning:
      application.status !== "Envoyé"
        ? "Relance générée: pense à marquer la candidature comme 'Envoyé'."
        : undefined,
    suggestedDate: suggestedDateLabel,
    followupEmailText,
  });
});
