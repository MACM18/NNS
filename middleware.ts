import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function middleware(req: NextRequest) {
  const nextUrl = req.nextUrl;
  const jwtSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  // NextAuth/Auth.js cookie names vary across versions and secure contexts.
  const cookieNamesToTry = [
    "__Secure-authjs.session-token",
    "authjs.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
  ];

  let token: Awaited<ReturnType<typeof getToken>> | null = null;
  for (const cookieName of cookieNamesToTry) {
    token = await getToken({
      req,
      secret: jwtSecret,
      cookieName,
    });
    if (token) break;
  }

  const isLoggedIn = !!token;
  const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isOnAuth =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register") ||
    nextUrl.pathname.startsWith("/auth");
  const isOnApi = nextUrl.pathname.startsWith("/api");
  const isOnPublic =
    nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/welcome");

  // Allow public routes
  if (isOnPublic || isOnApi) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Protect dashboard routes
  if (isOnDashboard && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  return NextResponse.next();
}

// Edge-compatible middleware using JWT decoding only

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes that don't need auth
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
