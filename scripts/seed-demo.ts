// En premier : peuple process.env depuis .env avant que lib/db/client.ts ne le lise.
import "./load-env";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { eq } from "drizzle-orm";
import { db, closeDb, isPglite } from "../lib/db/client";
import { organisations, users, candidateProfiles, jobs, applications } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/password";

/**
 * Jeu de démonstration.
 *
 * Un visiteur venu du portfolio ne peut pas entrer dans ApplyBot : créer un
 * organisme le laisse en attente d'activation, et le code d'organisme, il ne
 * l'a pas. Il repart sans avoir rien vu — le pire résultat pour un lien
 * annoncé comme « voir le produit en ligne ».
 *
 * Ce script crée un organisme actif et un étudiant déjà garni : des offres
 * classées, des candidatures à plusieurs stades, une relance qui arrive à
 * échéance. Il est **idempotent** : relancé, il remet le compte dans cet état
 * exact plutôt que d'empiler des doublons — c'est aussi la remise à zéro.
 *
 *   npm run seed-demo
 *
 * L'adresse et le mot de passe viennent de DEMO_EMAIL et DEMO_PASSWORD.
 */

const EMAIL = (process.env.DEMO_EMAIL ?? "demo@applybot.fr").toLowerCase();
const PASSWORD = process.env.DEMO_PASSWORD ?? "";
const CODE = "DEMO2026";

const jourss = (n: number) => new Date(Date.now() + n * 86_400_000);

/** Offres d'exemple : des intitulés réels du secteur, pas du lorem. */
const OFFRES = [
  {
    title: "Électricien bâtiment H/F",
    company: "Spie Batignolles",
    location: "Vénissieux",
    contract: "CDI",
    source: "France Travail",
    score: 86,
    statut: "Envoyé" as const,
    lettre: true,
    // Échue d'hier, et déjà rédigée : l'état « prête à partir ».
    relance: jourss(-1),
    relanceRedigee: true,
  },
  {
    // Le même stade, mais la relance reste à écrire : c'est ce que le tableau de
    // bord compte dans « relances à faire », et ce qu'il propose en action du jour.
    title: "Électricien d'équipement industriel",
    company: "Ortec Services",
    location: "Feyzin",
    contract: "CDI",
    source: "France Travail",
    score: 83,
    statut: "Envoyé" as const,
    lettre: true,
    relance: jourss(-2),
    relanceRedigee: false,
  },
  {
    title: "Monteur-câbleur en armoires électriques",
    company: "Groupe Cegelec",
    location: "Saint-Priest",
    contract: "CDI",
    source: "Adzuna",
    score: 81,
    statut: "À valider" as const,
    lettre: true,
    relance: null,
    relanceRedigee: false,
  },
  {
    title: "Électricien tertiaire — chantiers neufs",
    company: "Eiffage Énergie Systèmes",
    location: "Lyon 7e",
    contract: "CDI",
    source: "France Travail",
    score: 78,
    statut: "Nouveau" as const,
    lettre: false,
    relance: null,
    relanceRedigee: false,
  },
  {
    title: "Technicien de maintenance électrique",
    company: "Dalkia",
    location: "Villeurbanne",
    contract: "CDI",
    source: "Jooble",
    score: 74,
    statut: "Nouveau" as const,
    lettre: false,
    relance: null,
    relanceRedigee: false,
  },
  {
    title: "Apprenti électricien — alternance",
    company: "Bouygues Énergies & Services",
    location: "Bron",
    contract: "Alternance",
    source: "La Bonne Alternance",
    score: 69,
    statut: "Refusé" as const,
    lettre: true,
    relance: null,
    relanceRedigee: false,
  },
];

async function main() {
  // PGlite en fichier n'accepte qu'UN processus à la fois. Lancer ce script
  // pendant que `npm run dev` tourne écrit dans le vide — le serveur ne voit
  // rien — et peut corrompre la base. Le même garde-fou existe dans
  // create-admin.ts ; je m'y suis fait prendre en l'oubliant ici.
  if (isPglite()) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      console.log("Base PGlite locale : arrêtez d'abord le serveur de développement (npm run dev ou l'aperçu).");
      const rep = (await rl.question("Le serveur est bien arrêté ? [o/N] ")).trim().toLowerCase();
      if (rep !== "o" && rep !== "oui") {
        console.log("Abandon : arrêtez le serveur puis relancez npm run seed-demo.");
        return;
      }
    } finally {
      rl.close();
    }
  }

  if (PASSWORD.length < 10) {
    console.error(
      "DEMO_PASSWORD manquant ou trop court (10 caractères minimum).\n" +
        "Définissez DEMO_EMAIL et DEMO_PASSWORD avant de lancer ce script.",
    );
    process.exitCode = 1;
    return;
  }

  // 1. L'organisme, actif d'emblée — c'est tout l'objet de la démonstration.
  const [orgExistant] = await db.select().from(organisations).where(eq(organisations.code, CODE)).limit(1);
  const org =
    orgExistant ??
    (
      await db
        .insert(organisations)
        .values({ name: "Greta Rhône — promo électricité", code: CODE, seats: 20, active: true })
        .returning()
    )[0];

  if (orgExistant) {
    await db
      .update(organisations)
      .set({ name: "Greta Rhône — promo électricité", seats: 20, active: true, updatedAt: new Date() })
      .where(eq(organisations.id, org.id));
  }

  // 2. L'étudiant. On réécrit le mot de passe à chaque passage : le compte est
  //    public, il doit rester conforme à ce qu'annonce la page de démonstration.
  const hash = await hashPassword(PASSWORD);
  const [userExistant] = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
  const user =
    userExistant ??
    (
      await db
        .insert(users)
        .values({ email: EMAIL, passwordHash: hash, role: "etudiant", organisationId: org.id })
        .returning()
    )[0];

  if (userExistant) {
    await db
      .update(users)
      .set({ passwordHash: hash, organisationId: org.id, role: "etudiant", deletedAt: null })
      .where(eq(users.id, user.id));
  }

  // 3. On repart d'une ardoise nette : les candidatures partent en cascade avec
  //    les offres, donc supprimer les offres suffit.
  await db.delete(applications).where(eq(applications.userId, user.id));
  await db.delete(jobs).where(eq(jobs.userId, user.id));

  // 4. Le profil, pour que le classement des offres ait un sens.
  const profil = {
    fileName: "cv-demonstration.pdf",
    rawText: "Profil de démonstration ApplyBot.",
    fullName: "Camille Perrin",
    role: "Électricienne bâtiment",
    location: "Lyon",
    email: EMAIL,
    summary:
      "Sortie de formation électricité, cherche un premier poste en bâtiment ou en tertiaire sur Lyon et sa périphérie.",
    technicalSkills: ["Habilitation B1V", "Lecture de plans", "Tirage de câbles", "Armoires électriques"],
    softSkills: ["Rigueur", "Travail en équipe"],
    experienceHighlights: ["Stage de 6 semaines chez un installateur", "Chantier école : logement collectif"],
    targetRole: "Électricien bâtiment",
    preferredKeywords: ["électricien", "câblage", "tertiaire", "maintenance"],
  };
  const [profilExistant] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, user.id))
    .limit(1);
  if (profilExistant) {
    await db.update(candidateProfiles).set({ ...profil, updatedAt: new Date() }).where(eq(candidateProfiles.userId, user.id));
  } else {
    await db.insert(candidateProfiles).values({ userId: user.id, ...profil });
  }

  // 5. Les offres et leurs candidatures.
  let candidatures = 0;
  for (const o of OFFRES) {
    const [job] = await db
      .insert(jobs)
      .values({
        userId: user.id,
        title: o.title,
        company: o.company,
        location: o.location,
        contract: o.contract,
        source: o.source,
        sourceLabels: [o.source],
        score: o.score,
        status: o.statut,
        postedAt: jourss(-3),
      })
      .returning();

    if (o.statut === "Nouveau") continue;

    await db.insert(applications).values({
      userId: user.id,
      jobId: job.id,
      status: o.statut,
      letterGenerated: o.lettre,
      emailGenerated: o.lettre,
      linkedinGenerated: false,
      letterText: o.lettre
        ? `Madame, Monsieur,\n\nVotre offre « ${o.title} » chez ${o.company} correspond à ce que je cherche à la sortie de ma formation en électricité.\n\nJ'ai suivi un chantier école en logement collectif et un stage de six semaines chez un installateur : lecture de plans, tirage de câbles, raccordement d'armoires. Je suis habilitée B1V et disponible immédiatement sur ${o.location} et ses environs.\n\nJe reste à votre disposition pour en parler.\n\nCamille Perrin`
        : null,
      emailText: o.lettre ? `Bonjour,\n\nJe me permets de vous adresser ma candidature pour le poste de ${o.title}.\n\nCamille Perrin` : null,
      followupDueAt: o.relance,
      followupEmailText: o.relance && o.relanceRedigee !== false
        ? `Bonjour,\n\nJe me permets de revenir vers vous au sujet de ma candidature au poste de ${o.title}, envoyée il y a quatre jours.\n\nCamille Perrin`
        : null,
    });
    candidatures += 1;
  }

  console.log(
    `Démonstration prête.\n` +
      `  organisme   : ${org.name} (code ${CODE}, ${org.seats} places, actif)\n` +
      `  étudiant   : ${EMAIL}\n` +
      `  offres      : ${OFFRES.length}\n` +
      `  candidatures: ${candidatures}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closeDb);
