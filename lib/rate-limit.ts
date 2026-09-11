import { HttpError } from "@/lib/http";
import {
  countCvImportsSince,
  countLoginAttemptsSince,
  countSearchRunsSince,
  oldestCvImportSince,
  oldestSearchRunSince,
  recordLoginAttempt,
} from "@/lib/db/queries/quotas";

// Quotas fixés par la spec (contraintes globales du plan) : pas de surcharge par variable
// d'environnement.
export const SEARCH_WINDOW_MS = 60 * 60 * 1000; // 1 recherche / utilisateur / heure
export const SEARCH_MAX = 1;

export const IMPORT_WINDOW_MS = 24 * 60 * 60 * 1000; // 10 imports / utilisateur / 24 h glissantes
export const IMPORT_MAX = 10;

export const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 10 essais / e-mail / 15 min glissantes
export const LOGIN_MAX = 10;

// Anti-flood par IP, partagé entre register/register-organisation/login : réutilise la table
// `login_attempts` avec un e-mail préfixé "ip:" pour ne pas ajouter de table dédiée.
export const IP_WINDOW_MS = 15 * 60 * 1000;
export const IP_MAX = 30;

function formatParisHHmm(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export async function checkSearchQuota(userId: string) {
  const since = new Date(Date.now() - SEARCH_WINDOW_MS);
  const count = await countSearchRunsSince(userId, since);
  if (count >= SEARCH_MAX) {
    const oldest = (await oldestSearchRunSince(userId, since)) ?? new Date();
    throw new HttpError(429, `Prochaine recherche possible à ${formatParisHHmm(new Date(oldest.getTime() + SEARCH_WINDOW_MS))}`);
  }
}

export async function checkImportQuota(userId: string) {
  const since = new Date(Date.now() - IMPORT_WINDOW_MS);
  const count = await countCvImportsSince(userId, since);
  if (count >= IMPORT_MAX) {
    const oldest = (await oldestCvImportSince(userId, since)) ?? new Date();
    throw new HttpError(429, `Prochain import possible à ${formatParisHHmm(new Date(oldest.getTime() + IMPORT_WINDOW_MS))}`);
  }
}

export async function checkLoginAttempts(email: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const count = await countLoginAttemptsSince(email, since);
  if (count >= LOGIN_MAX) {
    throw new HttpError(429, "Trop de tentatives de connexion, réessayez dans quelques minutes");
  }
}

// Adresse IP du client : premier maillon de `x-forwarded-for`, sinon "local" (dev/tests sans proxy).
export function getClientIp(req: Request) {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "local";
}

function ipKey(ip: string) {
  return `ip:${ip}`;
}

export async function checkIpAttempts(ip: string) {
  const since = new Date(Date.now() - IP_WINDOW_MS);
  const count = await countLoginAttemptsSince(ipKey(ip), since);
  if (count >= IP_MAX) {
    throw new HttpError(429, "Trop de requêtes depuis cette adresse, réessayez dans quelques minutes");
  }
}

export async function recordIpAttempt(ip: string) {
  await recordLoginAttempt(ipKey(ip));
}
