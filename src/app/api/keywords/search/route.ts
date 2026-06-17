import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { deductCredits } from "@/lib/credits";
import { getKeywordSuggestions } from "@/lib/youtube";
import { prisma } from "@/lib/prisma";
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

  // Deduct 1 credit for using the keyword tool
  await deductCredits(userId, "keyword-search", 1);

  // Fetch suggestions and volume (handled with Redis caching inside)
  const results = await getKeywordSuggestions(query);

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

export const POST = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to perform keyword research");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    throw new ValidationError("Invalid JSON request body");
  }

  const queryObj = body as Record<string, unknown>;
  const query = (
    (typeof queryObj?.q === "string" ? queryObj.q : typeof queryObj?.query === "string" ? queryObj.query : "") as string
  ).trim();

  if (!query) {
    throw new ValidationError("Search query 'q' or 'query' is required in the body", "q");
  }

  const userId = session.user.id;

  // Deduct 1 credit for using the keyword tool
  await deductCredits(userId, "keyword-search", 1);

  // Fetch suggestions and volume (handled with Redis caching inside)
  const results = await getKeywordSuggestions(query);

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

