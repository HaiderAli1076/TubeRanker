/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import * as jose from "jose";
import { env } from "@/lib/env";

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
  const secretKey = new TextEncoder().encode(env.NEXTAUTH_SECRET);

  // Expiry calculation: exactly 5 minutes (300 seconds) from now
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 5 * 60; // 5 minutes (300 seconds) in the future

  // Issue and sign JWT using jose library
  const jwt = await new jose.SignJWT({ userId })
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
