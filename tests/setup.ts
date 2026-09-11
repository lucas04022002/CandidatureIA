process.env.JWT_SECRET ??= "test-secret-at-least-32-characters-long-000";
process.env.DATABASE_URL ??= "pglite://memory";
process.env.NODE_ENV = "test";
