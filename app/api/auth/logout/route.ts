import { handle, json, assertSameOrigin } from "@/lib/http";
import { clearSessionCookie } from "@/lib/auth/session";

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
});
