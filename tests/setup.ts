process.env.JWT_SECRET ??= "test-secret-at-least-32-characters-long-000";
process.env.DATABASE_URL ??= "pglite://memory";
// 1 saut de confiance par défaut : exerce la vraie logique de getClientIp (lib/rate-limit.ts) dans
// les tests plutôt que le court-circuit "0 = IP inconnue". Les tests qui vérifient spécifiquement
// le comportement à 0 le fixent eux-mêmes puis le restaurent.
process.env.TRUSTED_PROXY_HOPS ??= "1";
