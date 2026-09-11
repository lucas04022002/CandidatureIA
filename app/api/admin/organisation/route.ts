import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireRole } from "@/lib/auth/session";
import { setOrganisationStatus } from "@/lib/db/queries/organisations";
import { findUserByEmail, setUserOrganisation } from "@/lib/db/queries/users";

const Body = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
  seats: z.number().int().min(0).max(10000),
  // Facultatif : (ré)attache un responsable à l'organisme. C'est la sortie de secours de
  // l'organisme orphelin — la purge RGPD, une démission ou une suppression de compte peut laisser
  // un organisme sans personne pour régénérer son code, gérer ses places ou retirer un membre.
  // Signalé par `scripts/purge-inactive.ts`, réparé ici, procédure dans deploy/coolify.md.
  responsableEmail: z.email().optional(),
});

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  await requireRole("admin");
  const b = await readJson(req, Body);

  // Le responsable est résolu et validé AVANT toute écriture : un e-mail inconnu ou un compte qui
  // n'est pas responsable ne doit pas laisser l'activation et les places à moitié appliquées.
  let responsable: Awaited<ReturnType<typeof findUserByEmail>> | null = null;
  if (b.responsableEmail) {
    responsable = await findUserByEmail(b.responsableEmail);
    if (!responsable) {
      return json({ ok: false, error: "Aucun compte actif avec cet e-mail." }, { status: 404 });
    }
    if (responsable.role !== "responsable") {
      // Volontairement pas de promotion de rôle ici : transformer un stagiaire en responsable lui
      // donnerait vue sur les membres de l'organisme. Ça se décide, ça ne se fait pas en effet de
      // bord d'une mise à jour de places.
      return json(
        { ok: false, error: "Ce compte n'est pas un responsable d'organisme." },
        { status: 400 },
      );
    }
  }

  const org = await setOrganisationStatus(b.id, { active: b.active, seats: b.seats });
  if (!org) return json({ ok: false, error: "Organisme introuvable." }, { status: 404 });

  // Vaut aussi bien pour un responsable sans organisme que pour un responsable déjà rattaché
  // ailleurs : dans les deux cas, il repart sur celui-ci.
  if (responsable) await setUserOrganisation(responsable.id, org.id);

  return json({
    ok: true,
    organisation: {
      id: org.id,
      name: org.name,
      code: org.code,
      active: org.active,
      seats: org.seats,
      responsableEmail: responsable?.email ?? null,
    },
  });
});
