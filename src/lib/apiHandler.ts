import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { AppError, ValidationError, RateLimitError } from "./errors";
import { logger } from "./logger";
import { rateLimit } from "./rateLimit";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { tenantStorage } from "./prisma";
import * as Sentry from "@sentry/nextjs";

type RouteHandler<T = unknown> = (
  req: NextRequest,
  context: T
) => Promise<NextResponse> | NextResponse;

export function apiHandler<T = unknown>(handler: RouteHandler<T>): RouteHandler<T> {
  return async (req: NextRequest, context: T) => {
    // 1. Resolve tenant context parameters from session, headers, or query params
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || undefined;
    const workspaceId =
      req.headers.get("x-workspace-id") ||
      req.nextUrl.searchParams.get("workspaceId") ||
      undefined;

    return tenantStorage.run({ workspaceId, userId }, async () => {
      const origin = req.headers.get("origin") || "";
      const ALLOWED_EXTENSIONS = [
        "chrome-extension://ihpcgflkfhocmfgohjlnkkjflpmpnhlh", // Main Chrome Extension ID
      ];
      const isExtension =
        ALLOWED_EXTENSIONS.includes(origin) ||
        (process.env.NODE_ENV === "development" && origin.startsWith("chrome-extension://"));

      // Handle preflight OPTIONS requests from extensions
      if (isExtension && req.method === "OPTIONS") {
        return new NextResponse(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-idempotency-key",
          },
        });
      }

      try {
        // Apply rate limiting based on route path
        const pathname = req.nextUrl.pathname;
        const isWebhookRoute = pathname.startsWith("/api/webhooks");
        if (!isWebhookRoute) {
          const ip =
            req.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "127.0.0.1";
          const isAuthRoute = pathname.startsWith("/api/auth");
          await rateLimit(ip, isAuthRoute ? "auth" : "general");
        }

        const response = await handler(req, context);
        if (isExtension) {
          response.headers.set("Access-Control-Allow-Origin", origin);
          response.headers.set("Access-Control-Allow-Credentials", "true");
          response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-idempotency-key");
        }
        return response;
      } catch (error: unknown) {
        let response: NextResponse;

        if (error instanceof AppError) {
          const payload: {
            success: boolean;
            error: {
              code: string;
              message: string;
              field?: string;
              retryAfter?: number;
            };
          } = {
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          };

          const headers: Record<string, string> = {};

          if (error instanceof ValidationError && error.field) {
            payload.error.field = error.field;
          }

          if (error instanceof RateLimitError && error.retryAfter !== undefined) {
            payload.error.retryAfter = error.retryAfter;
            headers["Retry-After"] = String(error.retryAfter);
          }

          logger.warn(`API business error: ${error.code} - ${error.message}`, {
            path: req.nextUrl?.pathname || req.url,
            code: error.code,
            statusCode: error.statusCode,
          });

          response = NextResponse.json(payload, { status: error.statusCode, headers });
        } else if (
          error instanceof Prisma.PrismaClientKnownRequestError ||
          error instanceof Prisma.PrismaClientUnknownRequestError ||
          error instanceof Prisma.PrismaClientRustPanicError ||
          error instanceof Prisma.PrismaClientInitializationError ||
          error instanceof Prisma.PrismaClientValidationError
        ) {
          const prismaCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
          logger.error(`Database error during request: ${error.message}`, {
            path: req.nextUrl?.pathname || req.url,
            prismaCode,
            stack: error.stack,
          });
          Sentry.captureException(error);

          response = NextResponse.json(
            {
              success: false,
              error: {
                code: "DATABASE_ERROR",
                message: "A database operation error occurred.",
              },
            },
            { status: 500 }
          );
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          logger.error(`Unhandled API exception: ${errorMessage}`, {
            path: req.nextUrl?.pathname || req.url,
            stack: errorStack,
          });
          Sentry.captureException(error);

          response = NextResponse.json(
            {
              success: false,
              error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "An unexpected internal server error occurred.",
              },
            },
            { status: 500 }
          );
        }

        if (isExtension) {
          response.headers.set("Access-Control-Allow-Origin", origin);
          response.headers.set("Access-Control-Allow-Credentials", "true");
          response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-idempotency-key");
        }

        return response;
      }
    });
  };
}
