/**
 * Destination de redirection après connexion, ramenée à un chemin interne.
 *
 * `/login?next=…` est une URL : n'importe qui peut fabriquer le lien et le faire cliquer. Sans
 * filtrage, `next=https://applybot-login.example` renvoie la victime sur un site tiers juste après
 * une connexion réussie — un hameçonnage particulièrement crédible, puisque le parcours a bien
 * commencé sur le vrai domaine (open redirect).
 *
 * Ne sont acceptés que les chemins commençant par une seule barre oblique :
 * - `//evil` et `/\evil` sont des URLs protocol-relative (le navigateur y voit un autre hôte) ;
 * - la présence de « : » écarte `https://evil` comme `javascript:alert(1)` ;
 * - tout le reste retombe sur `/dashboard`.
 */
export const DEFAULT_NEXT_PATH = "/dashboard";

export function safeNextPath(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT_PATH;
  if (!raw.startsWith("/")) return DEFAULT_NEXT_PATH;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_NEXT_PATH;
  if (raw.includes(":")) return DEFAULT_NEXT_PATH;
  return raw;
}
