const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&eacute;": "é",
  "&egrave;": "è",
  "&agrave;": "à",
  "&ccedil;": "ç",
  "&ugrave;": "ù",
  "&ecirc;": "ê",
  "&ocirc;": "ô",
  "&icirc;": "î",
  "&rsquo;": "'",
  "&hellip;": "…",
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&[a-z]+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? " ");
}

// Nettoie une description d'offre scrapée: commentaires HTML (artefacts de
// rendu type <!---->), balises, entités, espaces superflus.
export function sanitizeJobDescription(value: string | null | undefined): string | null {
  if (!value) return null;

  const cleaned = decodeHtmlEntities(
    value
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\s*\/?\s*>/gi, "\n")
      .replace(/<\s*li[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned || null;
}
