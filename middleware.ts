import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function middleware(req: Request & { nextUrl: URL }) {
  const nextUrl = (req as any).nextUrl as URL;
  const token = await getToken({
    req: req as any,
    secret: process.env.NEXTAUTH_SECRET,
  });
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
