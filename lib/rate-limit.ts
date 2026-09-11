import { HttpError } from "@/lib/http";
import { countCvImportsSince, countLoginAttemptsSince, countSearchRunsSince } from "@/lib/db/queries/quotas";

// Quotas fixés par la spec (contraintes globales du plan) : pas de surcharge par variable
// d'environnement.
export const SEARCH_WINDOW_MS = 60 * 60 * 1000; // 1 recherche / utilisateur / heure
export const SEARCH_MAX = 1;

export const IMPORT_WINDOW_MS = 24 * 60 * 60 * 1000; // 10 imports / utilisateur / 24 h glissantes
export const IMPORT_MAX = 10;

export const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 10 essais / e-mail / 15 min glissantes
export const LOGIN_MAX = 10;

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
    throw new HttpError(429, `Prochaine recherche possible à ${formatParisHHmm(new Date(Date.now() + SEARCH_WINDOW_MS))}`);
  }
}

export async function checkImportQuota(userId: string) {
  const since = new Date(Date.now() - IMPORT_WINDOW_MS);
  const count = await countCvImportsSince(userId, since);
  if (count >= IMPORT_MAX) {
    throw new HttpError(429, `Prochain import possible à ${formatParisHHmm(new Date(Date.now() + IMPORT_WINDOW_MS))}`);
  }
}

export async function checkLoginAttempts(email: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const count = await countLoginAttemptsSince(email, since);
  if (count >= LOGIN_MAX) {
    throw new HttpError(429, "Trop de tentatives de connexion, réessayez dans quelques minutes");
  }
}
