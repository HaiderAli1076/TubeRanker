/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import * as jose from "jose";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rateLimit";
import { RateLimitError } from "@/lib/errors";

export const runtime = "edge";

export async function GET(req: Request) {
  // Read session token from cookies using getToken (Edge Runtime compatible)
  const token = await getToken({
    // Justification: Cast to any because standard Request in Edge runtime is passed to NextAuth's getToken which expects NextApiRequest/NextRequest.
    req: req as any,
    secret: env.NEXTAUTH_SECRET,
  });

  if (!token || !token.sub) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AUTH_UNAUTHORIZED",
          message: "Unauthorized. Please log in to generate an extension token.",
        },
      },
      { status: 401 }
    );
  }

  const userId = token.sub;

  // SECURITY: This route is not wrapped in apiHandler (edge runtime incompatibility),
  // so rate limiting must be applied manually. Limit to 10 requests/min per userId
  // to prevent token-minting abuse.
  try {
    await rateLimit(userId, "auth");
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            retryAfter: err.retryAfter,
          },
        },
        {
          status: 429,
          headers: err.retryAfter
            ? { "Retry-After": String(err.retryAfter) }
            : {},
        }
      );
    }
    // Non-rate-limit errors (e.g. Redis down): log and allow through
    console.error("[extension/token] Rate limit check error:", err);
  }

  const secretKey = new TextEncoder().encode(env.NEXTAUTH_SECRET);

  // Expiry calculation: exactly 5 minutes (300 seconds) from now
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 5 * 60; // 5 minutes (300 seconds) in the future

  // Issue and sign JWT using jose library.
  // SECURITY: The 'type: "ext_token"' claim distinguishes extension tokens from
  // NextAuth session JWTs, which are also signed with NEXTAUTH_SECRET. Consumers
  // of this token MUST verify this claim to prevent token-confusion attacks.
  const jwt = await new jose.SignJWT({ userId, type: "ext_token" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secretKey);

  return NextResponse.json({
    success: true,
    data: {
      token: jwt,
      expiresAt: exp * 1000, // convert to milliseconds
    },
  });
}
