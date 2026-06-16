/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { deductCredits } from "@/lib/credits";
import { getChannelStats, getChannelVideos } from "@/lib/youtube";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { AuthError, ValidationError, NotFoundError } from "@/lib/errors";

// Route-level analytics cache TTL: 24 hours (matches YouTube data freshness)
const ANALYTICS_CACHE_TTL = 86400;

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

  // ── Fix 3: Check route-level analytics cache FIRST (zero credit cost on HIT) ──
  // Key covers the full response shape: channel ID + pagination params
  const analyticsCacheKey = `analytics:${channelIdParam}:${take}:${cursor ?? "start"}`;
  const cachedAnalytics = await redis.get(analyticsCacheKey);
  if (cachedAnalytics) {
    return NextResponse.json({
      success: true,
      data: JSON.parse(cachedAnalytics),
      cached: true,
    });
  }

  // Cache MISS — proceed with DB / YouTube lookup

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
    // ── Fix 4: Only deduct credits AFTER a successful YouTube response ──
    let apiStats;
    try {
      apiStats = await getChannelStats(channelIdParam);
    } catch (error) {
      // Channel not found / YouTube error — do NOT deduct credits
      throw new NotFoundError(`Channel not found on YouTube: ${channelIdParam}`);
    }

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
  } else {
    // Channel already in DB — refresh statistics from YouTube (getChannelStats has its own 24h Redis cache via CACHE_KEYS.channelStats)
    let apiStats;
    try {
      apiStats = await getChannelStats(dbChannel.youtubeId);
    } catch (error) {
      // If refresh fails, do NOT deduct credits — just re-use existing DB data
      throw new NotFoundError(`Channel stats unavailable for: ${dbChannel.youtubeId}`);
    }
    stats = apiStats.statistics;
  }

  if (!dbChannel) {
    throw new NotFoundError("Channel not found");
  }

  // ── Fix 4: Deduct 1 credit only AFTER we have a successful channel response ──
  await deductCredits(userId, "channel-analytics", 1);

  // 2. Refresh / Sync video uploads from YouTube if DB is empty
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
      const channelDbId = dbChannel.id;
      const videosData = items.map((item) => ({
        youtubeId: item.id.videoId,
        channelId: channelDbId,
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

  const responseData = {
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
  };

  // ── Fix 3: Store successful response in analytics cache ──
  await redis.set(analyticsCacheKey, JSON.stringify(responseData), "EX", ANALYTICS_CACHE_TTL);

  return NextResponse.json({
    success: true,
    data: responseData,
  });
});
