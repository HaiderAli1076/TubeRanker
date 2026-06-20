/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { addAIJob } from "@/lib/ai/queue";
import { generateCacheKey, getCachedAIResult, getIdempotentResponse, saveToIdempotency } from "@/lib/ai/cache";
import { apiHandler } from "@/lib/apiHandler";
import { AuthError, ValidationError, QuotaError } from "@/lib/errors";
import { getCurrentRedisUsage } from "@/lib/redis";
import { processAIJobInline } from "@/lib/ai/inline";

export const POST = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to generate a scorecard");
  }

  const userId = session.user.id;

  // Check Redis command usage limits
  const redisUsage = await getCurrentRedisUsage();
  if (redisUsage.paused) {
    throw new QuotaError("Scorecard generation is temporarily paused due to monthly system limits. Please try again later.");
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

  const videoId = body.videoId?.trim();
  if (!videoId) {
    throw new ValidationError("Video ID is required", "videoId");
  }

  const inputs = { videoId };
  const tool = "video-scorecard";
  const creditsCost = 3; // scorecard cost: 3 credits

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

  // 5. Process the AI job inline (bypasses Railway queue)
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
});
