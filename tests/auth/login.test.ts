import { beforeAll, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../setup-db";
import { createUser } from "@/lib/db/queries/users";
import { hashPassword } from "@/lib/auth/password";

const mockCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
  }),
}));

const { POST: login } = await import("@/app/api/auth/login/route");
const { GET: me } = await import("@/app/api/auth/me/route");
const { POST: logout } = await import("@/app/api/auth/logout/route");

function request(path: string, init: RequestInit = {}) {
  return new Request(`http://localhost${path}`, {
    method: init.method ?? "POST",
    headers: { "content-type": "application/json", host: "localhost", "sec-fetch-site": "same-origin", ...(init.headers ?? {}) },
    body: init.body,
  });
}

function setSessionCookieFromResponse(res: Response) {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/ab_session=([^;]*)/);
  mockCookies.set("ab_session", match ? match[1] : "");
}

describe("connexion, session, déconnexion", () => {
  beforeAll(async () => {
    await resetDatabase();
    await createUser({
      email: "stagiaire@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "stagiaire",
      organisationId: null,
    });
  });

  it("bon mot de passe → 200 + cookie (flags conformes)", async () => {
    const r = await login(
      request("/api/auth/login", { body: JSON.stringify({ email: "stagiaire@ex.fr", password: "motdepasse-correct" }) }),
      {},
    );
    expect(r.status).toBe(200);
    const setCookie = r.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/ab_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Max-Age=604800/);
    setSessionCookieFromResponse(r);
  });

  it("origine cross-site (sec-fetch-site) → 403", async () => {
    const r = await login(
      request("/api/auth/login", {
        headers: { "sec-fetch-site": "cross-site" },
        body: JSON.stringify({ email: "stagiaire@ex.fr", password: "motdepasse-correct" }),
      }),
      {},
    );
    expect(r.status).toBe(403);
  });

  it("origine différente du host → 403", async () => {
    const r = await login(
      request("/api/auth/login", {
        headers: { origin: "https://evil.example" },
        body: JSON.stringify({ email: "stagiaire@ex.fr", password: "motdepasse-correct" }),
      }),
      {},
    );
    expect(r.status).toBe(403);
  });

  it("mauvais mot de passe → 401", async () => {
    const r = await login(
      request("/api/auth/login", { body: JSON.stringify({ email: "stagiaire@ex.fr", password: "mauvais-mot-de-passe" }) }),
      {},
    );
    expect(r.status).toBe(401);
  });

  it("e-mail inconnu → 401 (et verifyPassword s'exécute quand même)", async () => {
    const r = await login(
      request("/api/auth/login", { body: JSON.stringify({ email: "inconnu@ex.fr", password: "peu-importe-le-mot-de-passe" }) }),
      {},
    );
    expect(r.status).toBe(401);
  });

  it("11e essai en 15 min → 429", async () => {
    const email = "brute-force@ex.fr";
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) {
      last = await login(
        request("/api/auth/login", { body: JSON.stringify({ email, password: "mauvais-mot-de-passe" }) }),
        {},
      );
    }
    expect(last!.status).toBe(429);
    expect((await last!.json()).error).toBeTruthy();
  });

  it("GET /api/auth/me avec le cookie → { id, email, role, organisationId }", async () => {
    const r = await me(request("/api/auth/me", { method: "GET" }), {});
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ email: "stagiaire@ex.fr", role: "stagiaire", organisationId: null });
  });

  it("GET /api/auth/me sans cookie → 401", async () => {
    mockCookies.delete("ab_session");
    const r = await me(request("/api/auth/me", { method: "GET" }), {});
    expect(r.status).toBe(401);
  });

  it("POST /api/auth/logout → cookie vidé", async () => {
    const r = await logout(request("/api/auth/logout"), {});
    expect(r.status).toBe(200);
    const setCookie = r.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/ab_session=;/);
    expect(setCookie).toMatch(/Max-Age=0/i);
  });
});
