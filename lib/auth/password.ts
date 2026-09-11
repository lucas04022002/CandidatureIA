import { argon2id, argon2Verify } from "hash-wasm";
import { randomBytes } from "node:crypto";

// Paramètres OWASP (argon2id, base) : m=19456 (19 Mio), t=2, p=1.
export async function hashPassword(p: string) {
  return argon2id({ password: p, salt: randomBytes(16), parallelism: 1, iterations: 2, memorySize: 19456, hashLength: 32, outputType: "encoded" }); // "$argon2id$v=19$m=19456,t=2,p=1$…"
}

export const verifyPassword = (hash: string, p: string) => argon2Verify({ password: p, hash }).catch(() => false);
