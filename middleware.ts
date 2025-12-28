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
  const isOnForcePasswordChange =
    nextUrl.pathname === "/dashboard/force-password-change";

  // Allow public routes
  if (isOnPublic || isOnApi) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages (except 2FA page during login)
  if (isOnAuth && isLoggedIn && !nextUrl.pathname.startsWith("/auth/2fa")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Protect dashboard routes
  if (isOnDashboard && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  // Check for password expiry - redirect to force password change
  if (isOnDashboard && isLoggedIn && !isOnForcePasswordChange) {
    const passwordExpired = token?.passwordExpired as boolean | undefined;
    if (passwordExpired) {
      return NextResponse.redirect(
        new URL("/dashboard/force-password-change", nextUrl)
      );
    }
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
