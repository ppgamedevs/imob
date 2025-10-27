import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Middleware to protect admin and agent routes
 *
 * IMPORTANT: This middleware runs in Edge runtime and cannot use Prisma.
 * We only check for the presence of auth cookies here. Actual role verification
 * happens in the page components using server-side auth() calls.
 *
 * Protected paths:
 * - /admin/* - Requires session cookie (role check in page)
 * - /dashboard - Requires session cookie
 * - /a/* - Requires agent-session cookie (except /a/signin, /a/callback, /a/public/*)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Agent workspace routes - handle these first (match exactly "/a" or any subpath like "/a/..."; but NOT "/analyze")
  if (pathname === "/a" || pathname.startsWith("/a/")) {
    // Allow public agent routes
    if (
      pathname === "/a/signin" ||
      pathname === "/a/callback" ||
      pathname.startsWith("/a/public/")
    ) {
      return NextResponse.next();
    }

    // Check agent session - only for protected /a/* routes
    const agentToken = request.cookies.get("agent-session");

    if (!agentToken) {
      return NextResponse.redirect(new URL("/a/signin", request.url));
    }

    // Verify JWT (Edge-compatible)
    try {
      const secret = new TextEncoder().encode(
        process.env.AGENT_SESSION_SECRET || "change-me-in-production",
      );
      await jwtVerify(agentToken.value, secret);
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(new URL("/a/signin", request.url));
      response.cookies.delete("agent-session");
      return response;
    }
  }

  // Check for NextAuth session cookie for admin/dashboard routes
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

  // All other routes are public (/, /analyze, /discover, etc.)
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
