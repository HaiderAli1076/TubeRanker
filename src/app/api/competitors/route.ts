import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { getChannelStats } from "@/lib/youtube";
import { prisma } from "@/lib/prisma";
import { AuthError, ValidationError, NotFoundError } from "@/lib/errors";

/**
 * Lists all tracked competitors for the authenticated user.
 */
export const GET = apiHandler(async (_req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to view competitors");
  }

  const competitors = await prisma.competitor.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: competitors,
  });
});

/**
 * Tracks a new competitor by fetching official channel title and saving.
 */
export const POST = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to track a competitor");
  }

  const body = await req.json();
  const { youtubeId } = body;

  if (!youtubeId) {
    throw new ValidationError("YouTube Channel ID 'youtubeId' is required in request body", "youtubeId");
  }

  // Prevent duplicate tracking
  const existingCompetitor = await prisma.competitor.findFirst({
    where: {
      userId: session.user.id,
      youtubeId,
    },
  });

  if (existingCompetitor) {
    return NextResponse.json({
      success: true,
      data: existingCompetitor,
    });
  }

  // Fetch official channel name from YouTube API
  let channelName = "Unknown Channel";
  try {
    const channelData = await getChannelStats(youtubeId);
    channelName = channelData.snippet?.title || "Unknown Channel";
  } catch (error) {
    throw new NotFoundError(`Channel ID ${youtubeId} was not found on YouTube`);
  }

  const competitor = await prisma.competitor.create({
    data: {
      userId: session.user.id,
      youtubeId,
      name: channelName,
    },
  });

  return NextResponse.json({
    success: true,
    data: competitor,
  });
});

/**
 * Untracks/Deletes a competitor.
 */
export const DELETE = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to untrack a competitor");
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    throw new ValidationError("Query parameter 'id' of competitor is required", "id");
  }

  const competitor = await prisma.competitor.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!competitor) {
    throw new NotFoundError("Competitor not found or does not belong to you");
  }

  await prisma.competitor.delete({
    where: { id },
  });

  return NextResponse.json({
    success: true,
    message: "Competitor removed successfully",
  });
});
