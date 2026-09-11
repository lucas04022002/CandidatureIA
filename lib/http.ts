import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);

export function handle(fn: (req: Request, ctx: unknown) => Promise<Response>) {
  return async (req: Request, ctx: unknown) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return json({ error: "Données invalides", details: e.issues }, { status: 400 });
      console.error(e);
      return json({ error: "Erreur interne" }, { status: 500 });
    }
  };
}

export function assertSameOrigin(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new HttpError(403, "Origine refusée");
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) throw new HttpError(403, "Origine refusée");
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await req.json().catch(() => {
    throw new HttpError(400, "JSON attendu");
  }));
}
