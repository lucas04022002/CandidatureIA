import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cvImports, loginAttempts, searchRuns } from "@/lib/db/schema";

// Rétention de `login_attempts` : doit couvrir la plus large des fenêtres qui l'exploitent
// (connexion et anti-flood IP, toutes deux à 15 min dans `lib/rate-limit.ts`). Bornée ici plutôt
// qu'avec un job externe, pour que la table ne grossisse jamais sans limite.
const LOGIN_ATTEMPTS_RETENTION_MS = 15 * 60 * 1000;

export async function countSearchRunsSince(userId: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(searchRuns)
    .where(and(eq(searchRuns.userId, userId), gte(searchRuns.startedAt, since)));
  return (row?.count as number | undefined) ?? 0;
}

export async function oldestSearchRunSince(userId: string, since: Date) {
  const [row] = await db
    .select({ startedAt: searchRuns.startedAt })
    .from(searchRuns)
    .where(and(eq(searchRuns.userId, userId), gte(searchRuns.startedAt, since)))
    .orderBy(asc(searchRuns.startedAt))
    .limit(1);
  return row?.startedAt ?? null;
}

export async function recordSearchRun(userId: string) {
  await db.insert(searchRuns).values({ userId });
}

export async function countCvImportsSince(userId: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cvImports)
    .where(and(eq(cvImports.userId, userId), gte(cvImports.importedAt, since)));
  return (row?.count as number | undefined) ?? 0;
}

export async function oldestCvImportSince(userId: string, since: Date) {
  const [row] = await db
    .select({ importedAt: cvImports.importedAt })
    .from(cvImports)
    .where(and(eq(cvImports.userId, userId), gte(cvImports.importedAt, since)))
    .orderBy(asc(cvImports.importedAt))
    .limit(1);
  return row?.importedAt ?? null;
}

export async function recordCvImport(userId: string) {
  await db.insert(cvImports).values({ userId });
}

// `email` arrive déjà normalisé (minuscules) depuis les appelants (route de connexion, IP préfixée
// "ip:"), d'où une égalité stricte plutôt qu'un `lower()` qui empêcherait l'usage de l'index sur
// `login_attempts.email`.
export async function countLoginAttemptsSince(email: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.email, email), gte(loginAttempts.attemptedAt, since)));
  return (row?.count as number | undefined) ?? 0;
}

export async function recordLoginAttempt(email: string) {
  // Purge globale (toutes clés confondues, pas seulement `email`) avant l'insertion : borne la
  // taille de la table sans job de nettoyage séparé.
  await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, new Date(Date.now() - LOGIN_ATTEMPTS_RETENTION_MS)));
  await db.insert(loginAttempts).values({ email });
}

// Purge les tentatives d'un e-mail après une connexion réussie, pour qu'un utilisateur légitime ne
// se retrouve jamais bloqué par ses propres essais ratés précédents.
export async function deleteLoginAttempts(email: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.email, email));
}
