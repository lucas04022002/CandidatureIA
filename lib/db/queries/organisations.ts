import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { PLACES_ESSAI } from "@/lib/places";
import { db } from "@/lib/db/client";
import { organisations, users } from "@/lib/db/schema";
import { generateOrgCode } from "@/lib/auth/org-code";

export type OrgCodeReason = "unknown" | "inactive" | "full";

export class OrgCodeError extends Error {
  constructor(public reason: OrgCodeReason) {
    super(`organisation code error: ${reason}`);
  }
}

// Exécuteur partagé entre `db` et une transaction (`tx`) : les deux exposent `.select`/`.insert`/…
type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

async function countActiveTraineesWith(executor: Executor, organisationId: string) {
  const [row] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.organisationId, organisationId), eq(users.role, "etudiant"), isNull(users.deletedAt)));
  return (row?.count as number | undefined) ?? 0;
}

/** Places offertes à la création, avant toute discussion commerciale. */
// La constante vit dans lib/places.ts : les pages publiques l'affichent aussi,
// et ne doivent pas importer ce module (elles tireraient le client de base).
export { PLACES_ESSAI };

export async function findOrganisationByCode(code: string) {
  const rows = await db.select().from(organisations).where(eq(organisations.code, code)).limit(1);
  return rows[0] ?? null;
}

async function insertOrganisationWith(executor: Executor, name: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [org] = await executor
        .insert(organisations)
        // Actif d'emblée, avec un nombre de places d'essai.
        //
        // Auparavant un organisme naissait inactif et sans place : le
        // responsable créait son compte, voyait « organisme pas encore activé »,
        // et attendait une validation manuelle. Personne n'attend. Le filtrage
        // a priori n'avait de sens qu'avec de vrais clients à trier ; il n'a
        // produit que des comptes morts-nés.
        //
        // L'administration sert désormais à AJOUTER des places, pas à ouvrir la
        // porte : un organisme peut inscrire trois étudiants et voir le produit
        // fonctionner avant d'en discuter.
        .values({ name, code: generateOrgCode(), active: true, seats: PLACES_ESSAI })
        .returning();
      return org;
    } catch (e) {
      const code = (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
      if (code === "23505") continue;
      throw e;
    }
  }
  throw new Error("Impossible de générer un code d'organisme unique après plusieurs tentatives");
}

export async function createOrganisation(p: { name: string }) {
  return insertOrganisationWith(db, p.name);
}

export async function findOrganisationById(id: string) {
  const rows = await db.select().from(organisations).where(eq(organisations.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function countActiveTrainees(organisationId: string) {
  return countActiveTraineesWith(db, organisationId);
}

export async function registerResponsableWithNewOrganisation(p: { organisationName: string; email: string; passwordHash: string }) {
  return db.transaction(async (tx) => {
    const org = await insertOrganisationWith(tx, p.organisationName);
    const [user] = await tx
      .insert(users)
      .values({ email: p.email, passwordHash: p.passwordHash, role: "responsable", organisationId: org.id })
      .returning();
    return { organisation: org, user };
  });
}

export async function registerTraineeWithCode(p: { email: string; passwordHash: string; code: string }) {
  return db.transaction(async (tx) => {
    const [org] = await tx.select().from(organisations).where(eq(organisations.code, p.code)).for("update");
    if (!org) throw new OrgCodeError("unknown");
    if (!org.active) throw new OrgCodeError("inactive");
    const count = await countActiveTraineesWith(tx, org.id);
    if (count >= org.seats) throw new OrgCodeError("full");
    const [user] = await tx
      .insert(users)
      .values({ email: p.email, passwordHash: p.passwordHash, role: "etudiant", organisationId: org.id })
      .returning();
    return user;
  });
}

// Régénère le code d'inscription : l'ancien code cesse immédiatement de fonctionner (il n'existe
// plus en base), ce qui est tout l'intérêt de la manœuvre quand un code a fuité. Même boucle de
// réessai que l'insertion, pour le cas rarissime d'une collision sur `organisations.code`.
export async function regenerateCode(organisationId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [org] = await db
        .update(organisations)
        .set({ code: generateOrgCode(), updatedAt: new Date() })
        .where(eq(organisations.id, organisationId))
        .returning();
      return org ?? null;
    } catch (e) {
      const code = (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
      if (code === "23505") continue;
      throw e;
    }
  }
  throw new Error("Impossible de générer un code d'organisme unique après plusieurs tentatives");
}

// Ce que le responsable a le droit de voir de ses étudiants : l'e-mail et deux dates. Jamais leur
// CV, leurs offres ni leurs candidatures — d'où une projection explicite plutôt qu'un `select()`.
export async function listMembers(organisationId: string) {
  return db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(
      and(eq(users.organisationId, organisationId), eq(users.role, "etudiant"), isNull(users.deletedAt)),
    )
    .orderBy(desc(users.createdAt));
}

// L'étudiant n'est retourné que s'il appartient à CET organisme : un responsable qui envoie l'id
// d'un étudiant d'un autre organisme obtient `null`, donc un 404 côté route.
export async function findTraineeInOrganisation(organisationId: string, userId: string) {
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.organisationId, organisationId),
        eq(users.role, "etudiant"),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export interface OrganisationSummary {
  id: string;
  name: string;
  code: string;
  seats: number;
  active: boolean;
  createdAt: Date;
  responsableEmail: string | null;
  traineeCount: number;
}

// Vue d'administration. Deux requêtes plutôt qu'une jointure agrégée : le nombre d'organismes se
// compte en dizaines, et le rapprochement en mémoire reste lisible.
export async function listOrganisations(): Promise<OrganisationSummary[]> {
  const [orgs, members] = await Promise.all([
    db.select().from(organisations).orderBy(desc(organisations.createdAt)),
    db
      .select({ organisationId: users.organisationId, email: users.email, role: users.role })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(users.createdAt),
  ]);

  const responsables = new Map<string, string>();
  const trainees = new Map<string, number>();
  for (const m of members) {
    if (!m.organisationId) continue;
    if (m.role === "responsable" && !responsables.has(m.organisationId)) responsables.set(m.organisationId, m.email);
    if (m.role === "etudiant") trainees.set(m.organisationId, (trainees.get(m.organisationId) ?? 0) + 1);
  }

  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    code: org.code,
    seats: org.seats,
    active: org.active,
    createdAt: org.createdAt,
    responsableEmail: responsables.get(org.id) ?? null,
    traineeCount: trainees.get(org.id) ?? 0,
  }));
}

// Réservé à l'admin : l'activation et le nombre de places ne se négocient pas côté organisme.
export async function setOrganisationStatus(id: string, p: { active: boolean; seats: number }) {
  const [org] = await db
    .update(organisations)
    .set({ active: p.active, seats: p.seats, updatedAt: new Date() })
    .where(eq(organisations.id, id))
    .returning();
  return org ?? null;
}

// Organismes dont plus aucun responsable n'est actif : la purge des comptes dormants peut laisser
// un organisme orphelin, personne ne pouvant plus régénérer son code ni gérer ses places. Signalé
// par `scripts/purge-inactive.ts`, jamais désactivé automatiquement : couper l'accès des étudiants
// d'un organisme est une décision commerciale, pas une conséquence d'un script de maintenance.
export async function listOrganisationsWithoutResponsable() {
  const [orgs, responsables] = await Promise.all([
    db.select().from(organisations).orderBy(desc(organisations.createdAt)),
    db
      .select({ organisationId: users.organisationId })
      .from(users)
      .where(and(eq(users.role, "responsable"), isNull(users.deletedAt))),
  ]);

  const couverts = new Set(responsables.map((r) => r.organisationId).filter(Boolean));
  return orgs.filter((org) => !couverts.has(org.id));
}
