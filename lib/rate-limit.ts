import { HttpError } from "@/lib/http";
import { countCvImportsSince, countLoginAttemptsSince, countSearchRunsSince } from "@/lib/db/queries/quotas";

// Quotas quotidiens (calés sur minuit local) : valeurs par défaut raisonnables, ajustables sans
// changer de logique tant qu'un besoin produit plus précis n'est pas formulé.
export const SEARCH_QUOTA_PER_DAY = Number(process.env.SEARCH_QUOTA_PER_DAY ?? 5);
export const IMPORT_QUOTA_PER_DAY = Number(process.env.IMPORT_QUOTA_PER_DAY ?? 3);

// Fenêtre glissante anti-bruteforce sur la connexion.
export const LOGIN_ATTEMPTS_LIMIT = 10;
export const LOGIN_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function formatHHmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function checkSearchQuota(userId: string) {
  const count = await countSearchRunsSince(userId, startOfToday());
  if (count >= SEARCH_QUOTA_PER_DAY) {
    throw new HttpError(429, `Prochaine recherche possible à ${formatHHmm(startOfTomorrow())}`);
  }
}

export async function checkImportQuota(userId: string) {
  const count = await countCvImportsSince(userId, startOfToday());
  if (count >= IMPORT_QUOTA_PER_DAY) {
    throw new HttpError(429, `Prochain import possible à ${formatHHmm(startOfTomorrow())}`);
  }
}

export async function checkLoginAttempts(email: string) {
  const since = new Date(Date.now() - LOGIN_ATTEMPTS_WINDOW_MS);
  const count = await countLoginAttemptsSince(email, since);
  if (count >= LOGIN_ATTEMPTS_LIMIT) {
    throw new HttpError(429, "Trop de tentatives de connexion, réessayez dans quelques minutes");
  }
}
