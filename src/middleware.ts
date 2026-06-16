import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle CORS preflight OPTIONS requests from Chrome Extensions
  const origin = req.headers.get("origin") || "";
  const isExtension = origin.startsWith("chrome-extension://");
  if (isExtension && req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-idempotency-key",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isApiRoute = pathname.startsWith("/api");

  if (isDashboardRoute || (isApiRoute && req.method !== "OPTIONS")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      if (isApiRoute) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: "AUTH_UNAUTHORIZED",
              message: "Unauthorized access. Please log in.",
            },
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", req.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/api/:path*"],
};
