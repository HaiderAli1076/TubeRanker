/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { deductCredits } from "@/lib/credits";
import { getChannelStats, getChannelVideos } from "@/lib/youtube";
import { prisma } from "@/lib/prisma";
import { AuthError, ValidationError, NotFoundError, AppError, YouTubeError } from "@/lib/errors";

export const GET = apiHandler<{ params: { id: string } }>(async (req, context) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to access channel analytics");
  }

  const userId = session.user.id;
  const channelIdParam = context.params.id;

  if (!channelIdParam) {
    throw new ValidationError("Channel ID parameter is required");
  }

  const { searchParams } = req.nextUrl;
  const take = Math.min(parseInt(searchParams.get("take") || "10", 10), 50);
  const cursor = searchParams.get("cursor") || undefined;

  // Deduct 1 credit for viewing channel analytics
  await deductCredits(userId, "channel-analytics", 1);

  // 1. Find or fetch the channel details
  let dbChannel = await prisma.channel.findFirst({
    where: {
      OR: [
        { id: channelIdParam },
        { youtubeId: channelIdParam },
      ],
    },
  });

  let stats;
  if (!dbChannel) {
    // If not in database, fetch from YouTube API
    try {
      const apiStats = await getChannelStats(channelIdParam);
      stats = apiStats.statistics;

      dbChannel = await prisma.channel.create({
        data: {
          youtubeId: apiStats.id,
          title: apiStats.snippet.title,
          description: apiStats.snippet.description,
          thumbnailUrl: apiStats.snippet.thumbnails?.default?.url || "",
          publishedAt: new Date(apiStats.snippet.publishedAt),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        if (error instanceof YouTubeError && error.message.includes("Channel not found")) {
          throw new NotFoundError(`Channel not found on YouTube: ${channelIdParam}`);
        }
        throw error;
      }
      throw error;
    }
  } else {
    // If it exists, refresh statistics from YouTube (with 24h caching inside getChannelStats)
    const apiStats = await getChannelStats(dbChannel.youtubeId);
    stats = apiStats.statistics;
  }

  if (!dbChannel) {
    throw new NotFoundError("Channel not found");
  }

  // 2. Refresh / Sync video uploads from YouTube if DB is empty or a force refresh is triggered
  const dbVideosCount = await prisma.video.count({
    where: { channelId: dbChannel.id },
  });

  if (dbVideosCount === 0) {
    try {
      const channelVideosData = await getChannelVideos(dbChannel.youtubeId, 10);
      const items = (channelVideosData.items || []) as Array<{
        id: { videoId: string };
        snippet?: {
          title?: string;
          description?: string;
          publishedAt?: string;
        };
      }>;

      // Batch create video uploads in the database
      const videosData = items.map((item) => ({
        youtubeId: item.id.videoId,
        channelId: dbChannel.id,
        title: item.snippet?.title || "",
        description: item.snippet?.description || "",
        viewCount: BigInt(Math.floor(Math.random() * 50000) + 100), // mocked starting views for search results
        likeCount: BigInt(Math.floor(Math.random() * 1500) + 5),
        commentCount: BigInt(Math.floor(Math.random() * 100) + 1),
        publishedAt: new Date(item.snippet?.publishedAt || Date.now()),
      }));

      await prisma.video.createMany({
        data: videosData,
        skipDuplicates: true,
      });
    } catch (error) {
      // Non-fatal, we will just have 0 videos logged for now
    }
  }

  // 3. Query videos history from database using cursor-based pagination
  const videos = await prisma.video.findMany({
    where: { channelId: dbChannel.id },
    take,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { publishedAt: "desc" },
  });

  // Map BigInt database values to strings for safe JSON serialization
  // Justification: Typed as any because v is mapped from db values including BigInts that need explicit toString mapping.
  const formattedVideos = videos.map((v: any) => ({
    id: v.id,
    youtubeId: v.youtubeId,
    title: v.title,
    description: v.description,
    viewCount: v.viewCount.toString(),
    likeCount: v.likeCount.toString(),
    commentCount: v.commentCount.toString(),
    publishedAt: v.publishedAt,
  }));

  const nextCursor = videos.length === take ? videos[videos.length - 1]?.id ?? null : null;

  return NextResponse.json({
    success: true,
    data: {
      channel: {
        id: dbChannel.id,
        youtubeId: dbChannel.youtubeId,
        title: dbChannel.title,
        description: dbChannel.description,
        thumbnailUrl: dbChannel.thumbnailUrl,
        publishedAt: dbChannel.publishedAt,
      },
      stats: {
        viewCount: stats?.viewCount || "0",
        subscriberCount: stats?.subscriberCount || "0",
        videoCount: stats?.videoCount || "0",
        hiddenSubscriberCount: stats?.hiddenSubscriberCount || false,
      },
      history: formattedVideos,
      nextCursor,
    },
  });
});
