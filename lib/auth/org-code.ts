import { randomInt } from "node:crypto";

export const ORG_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateOrgCode() {
  let c = "";
  for (let i = 0; i < 8; i++) c += ORG_CODE_ALPHABET[randomInt(ORG_CODE_ALPHABET.length)];
  return c;
}
