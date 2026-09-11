import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/", "/login", "/organisme/inscription", "/mentions-legales", "/cgu"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname) || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return NextResponse.next();
  if (!req.cookies.get("ab_session")) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
