import { argon2id, argon2Verify } from "hash-wasm";
import { randomBytes } from "node:crypto";

export async function hashPassword(p: string) {
  return argon2id({ password: p, salt: randomBytes(16), parallelism: 1, iterations: 3, memorySize: 65536, hashLength: 32, outputType: "encoded" }); // "$argon2id$v=19$m=65536,t=3,p=1$…"
}

export const verifyPassword = (hash: string, p: string) => argon2Verify({ password: p, hash }).catch(() => false);
