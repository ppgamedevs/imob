import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Middleware to protect admin routes and enforce authentication
 *
 * IMPORTANT: This middleware runs in Edge runtime and cannot use Prisma.
 * We only check for the presence of auth cookies here. Actual role verification
 * happens in the page components using server-side auth() calls.
 *
 * Protected paths:
 * - /admin/* - Requires session cookie (role check in page)
 * - /dashboard - Requires session cookie
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for NextAuth session cookie (Edge-compatible)
  // NextAuth v5 uses different cookie names depending on environment
  const sessionCookie =
    request.cookies.get("authjs.session-token") || // HTTP (dev)
    request.cookies.get("__Secure-authjs.session-token") || // HTTPS (production)
    request.cookies.get("next-auth.session-token") || // Legacy HTTP
    request.cookies.get("__Secure-next-auth.session-token"); // Legacy HTTPS

  const hasSession = !!sessionCookie;

  // Protect all /admin routes
  if (pathname.startsWith("/admin")) {
    if (!hasSession) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    // Role verification happens in page components with requireAdmin()
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!hasSession) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

// Configure which routes trigger middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes that handle their own auth
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
