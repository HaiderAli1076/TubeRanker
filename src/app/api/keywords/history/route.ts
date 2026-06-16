import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/errors";

export const GET = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to view keyword history");
  }

  const userId = session.user.id;
  const { searchParams } = req.nextUrl;
  
  // Read and sanitize pagination parameters
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 100) : 10;
  const cursor = searchParams.get("cursor")?.trim();

  // Find user's keyword search history
  const history = await prisma.keywordHistory.findMany({
    where: { userId },
    take: limit + 1, // take 1 extra to determine next page availability
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | null = null;
  if (history.length > limit) {
    const nextItem = history.pop();
    nextCursor = nextItem?.id || null;
  }

  return NextResponse.json({
    success: true,
    data: {
      items: history,
      nextCursor,
    },
  });
});
