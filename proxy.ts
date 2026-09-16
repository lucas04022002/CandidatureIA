import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/", "/demo", "/login", "/organisme/inscription", "/mentions-legales", "/cgu"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname) || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return NextResponse.next();
  if (!req.cookies.get("ab_session")) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  return NextResponse.next();
}

// Les fichiers statiques servis depuis public/ (images, robots.txt, sitemap.xml…) sortent du
// périmètre : sans cette exclusion, une requête non authentifiée sur /globe.svg est redirigée vers
// /login et l'image renvoie du HTML — y compris sur la page de connexion elle-même, qui n'a pas de
// cookie de session par définition.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
