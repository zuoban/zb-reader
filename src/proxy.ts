import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/", "/login", "/register", "/api/auth"];

// Static assets that can be cached for 1 year
const STATIC_ASSET_PATTERNS = [
  /^\/_next\/static\//,
  /^\/_next\/image\//,
  /^\/fonts\//,
  /^\/images\//,
  /^\/manifest\.json$/,
  /^\/favicon\.ico$/,
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle public paths (login, register, auth)
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Handle static assets with cache headers
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    const response = NextResponse.next();
    if (pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|avif|ico)$/i)) {
      response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    }
    return response;
  }

  // Add cache headers for other static patterns
  const response = NextResponse.next();
  for (const pattern of STATIC_ASSET_PATTERNS) {
    if (pattern.test(pathname)) {
      response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      break;
    }
  }

  // Add security headers to all responses
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "origin-when-cross-origin");

  // Check authentication
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  response.headers.set("X-Request-Checked-At", new Date().toISOString());

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
