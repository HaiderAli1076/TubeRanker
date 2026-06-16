import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { deductCredits } from "@/lib/credits";
import { getKeywordSuggestions, CACHE_KEYS } from "@/lib/youtube";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { AuthError, ValidationError } from "@/lib/errors";

export const GET = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to perform keyword research");
  }

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q")?.trim();

  if (!query) {
    throw new ValidationError("Search query parameter 'q' is required", "q");
  }

  const userId = session.user.id;

  // ── Cache-first: check Redis before deducting any credits ──
  // Reuse the same key pattern as getKeywordSuggestions' internal cache so
  // we share the 24h TTL window with the youtube lib's own getCachedOrFetch.
  const cacheKey = CACHE_KEYS.keywordSuggestions(query);
  const cached = await redis.get(cacheKey);
  if (cached) {
    // Cache HIT — return data with zero credit cost
    return NextResponse.json({
      success: true,
      data: JSON.parse(cached),
      cached: true,
    });
  }

  // Cache MISS — call YouTube API, then deduct credits only on success
  const results = await getKeywordSuggestions(query);

  // ── Deduct 1 credit only after a successful API response ──
  await deductCredits(userId, "keyword-search", 1);

  // Record keyword search history in database
  await prisma.keywordHistory.create({
    data: {
      userId,
      keyword: query,
      volume: results.volume || 0,
    },
  });

  return NextResponse.json({
    success: true,
    data: results,
  });
});
