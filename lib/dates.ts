/**
 * Toutes les dates affichées à l'écran sont lues dans le fuseau **Europe/Paris**, jamais dans celui
 * du serveur.
 *
 * Pourquoi c'est un vrai défaut et pas un détail : `/jobs` formatait déjà son heure de relevé en
 * `Europe/Paris`, mais `/dashboard` comptait « les offres du jour » en comparant l'année, le mois et
 * le jour d'un `new Date()` **local**, et `/applications/[id]` datait l'envoi et la relance avec
 * `toLocaleDateString` sans `timeZone`. Sur un serveur en UTC — ce qu'est le conteneur de
 * production — une offre relevée le 12/09 à 01:30 heure de Paris porte la date UTC du 11/09 : elle
 * disparaissait du compteur « offres du jour », et la même candidature s'affichait « envoyée le
 * 11 septembre » sur sa fiche et comptait pour le 12 ailleurs. Deux écrans, deux vérités.
 *
 * Les trois pages passent maintenant par ici : une seule définition de « quel jour on est ».
 */
const PARIS = "Europe/Paris";

function usable(date: Date | null | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Le jour civil parisien d'un instant, en `AAAA-MM-JJ` — la forme comparable. `en-CA` donne
 * exactement ce format en `Intl`, ce qui évite de réassembler les parties à la main.
 *
 * Comparer deux `parisDay(...)` est la seule façon correcte de dire « même jour » : comparer des
 * `getFullYear()/getMonth()/getDate()` revient à poser la question dans le fuseau du serveur.
 */
export function parisDay(date: Date | null | undefined): string | null {
  if (!usable(date)) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** L'heure parisienne en `HH:MM`, 24 h (« relevé de 07:30 »). */
export function formatParisTime(date: Date | null | undefined): string | null {
  if (!usable(date)) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Une date parisienne en français. Par défaut « 12 septembre » (jour + mois en toutes lettres) ;
 * `options` permet la forme courte « 12/09 » de la ligne mono d'une offre.
 */
export function formatParisDate(
  date: Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
): string | null {
  if (!usable(date)) return null;
  return new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS, ...options }).format(date);
}
