/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { rateLimit } from "../rateLimit";
import { addAIJob } from "./queue";
import type { JobPriority } from "./queue";
import { generateCacheKey, getCachedAIResult, getIdempotentResponse, saveToIdempotency } from "./cache";
import { prisma } from "../prisma";
import { AuthError, ValidationError, QuotaError } from "../errors";
import { getCurrentRedisUsage } from "../redis";
import { processAIJobInline } from "./inline";

/**
 * Shared API request handler for all 5 AI tools.
 */
export async function handleAIRequest(
  req: Request,
  tool: string,
  creditsCost: number,
  extractInputs: (body: any) => Record<string, unknown>
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to use AI tools");
  }

  const userId = session.user.id;

  // Check Redis command usage limits
  const redisUsage = await getCurrentRedisUsage();
  if (redisUsage.paused) {
    throw new QuotaError("AI generation is temporarily paused due to monthly system limits. Please try again later.");
  }

  // 1. Enforce AI Rate Limiting (5/min/user)
  await rateLimit(userId, "ai");

  // 2. Check Idempotency Key
  const idempotencyKey = req.headers.get("x-idempotency-key") || req.headers.get("X-Idempotency-Key");
  if (idempotencyKey) {
    const cachedResponse = await getIdempotentResponse(idempotencyKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }
  }

  // 3. Parse request body
  let body: any;
  try {
    body = await req.json();
  } catch (error) {
    throw new ValidationError("Invalid JSON request body");
  }
  const inputs = extractInputs(body);

  // 4. Check Cache first
  const cacheKey = generateCacheKey(tool, inputs);
  const cachedResult = await getCachedAIResult(cacheKey);
  if (cachedResult) {
    const responseBody = {
      success: true,
      data: {
        state: "completed",
        result: cachedResult,
      },
    };
    if (idempotencyKey) {
      await saveToIdempotency(idempotencyKey, responseBody);
    }
    return NextResponse.json(responseBody);
  }

  // 5. Query user's plan to set priority
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripePriceId: true },
  });

  let priority: JobPriority = "low";
  if (dbUser?.stripePriceId === "price_agency_subscription") {
    priority = "high";
  } else if (dbUser?.stripePriceId === "price_pro_subscription") {
    priority = "medium";
  }

  // 6. Process the AI job inline (bypasses Railway queue)
  const result = await processAIJobInline(userId, tool, inputs, creditsCost, cacheKey);

  const responseBody = {
    success: true,
    data: {
      state: "completed",
      result,
    },
  };

  if (idempotencyKey) {
    await saveToIdempotency(idempotencyKey, responseBody);
  }

  return NextResponse.json(responseBody);
}
