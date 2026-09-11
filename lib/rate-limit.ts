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

function trustedProxyHops() {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Adresse IP du client, à ne jamais faire confiance aveuglément : `x-forwarded-for` est un en-tête
// que n'importe quel client peut forger. `TRUSTED_PROXY_HOPS` (0 par défaut) déclare combien de
// reverse proxies de confiance (Traefik/Coolify…) précèdent l'appli et ajoutent chacun une adresse
// à la fin de l'en-tête. Sans proxy de confiance déclaré (0, le défaut en dev direct), l'adresse du
// client est simplement inconnue depuis un route handler Next : on retourne `null` et la limite par
// IP est désactivée plutôt que de regrouper tout le monde sous un même compartiment "local".
export function getClientIp(req: Request): string | null {
  const hops = trustedProxyHops();
  if (hops <= 0) return null;

  const parts = req.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts || parts.length === 0) return null;

  // N-ième adresse en partant de la DROITE : avec N proxies de confiance, chacun ajoute une entrée
  // à la fin ; la N-ième depuis la droite est donc la dernière adresse posée par un tiers non fiable
  // (le vrai client), celles plus à droite ayant été ajoutées par nos propres proxies.
  const index = parts.length - hops;
  if (index < 0) return null;
  return parts[index] || null;
}

function ipKey(ip: string) {
  return `ip:${ip}`;
}

export async function checkIpAttempts(ip: string | null) {
  if (!ip) return;
  const since = new Date(Date.now() - IP_WINDOW_MS);
  const count = await countLoginAttemptsSince(ipKey(ip), since);
  if (count >= IP_MAX) {
    throw new HttpError(429, "Trop de requêtes depuis cette adresse, réessayez dans quelques minutes");
  }
}

export async function recordIpAttempt(ip: string | null) {
  if (!ip) return;
  await recordLoginAttempt(ipKey(ip));
}
