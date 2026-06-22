import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { getCachedAIResult } from "@/lib/ai/cache";
import { apiHandler } from "@/lib/apiHandler";
import { AuthError, ValidationError, QuotaError } from "@/lib/errors";
import { getCurrentRedisUsage, getRedis } from "@/lib/redis";
import { deductCredits, addCredits } from "@/lib/credits";
import { getChannelStats, getPlaylistItems, getVideosDetailsBatch } from "@/lib/youtube";
import { buildScorecardPrompt } from "@/lib/ai/prompts/scorecard-prompt";
import { generateAIContent } from "@/lib/ai/gemini";
import { ScorecardSchema } from "@/lib/schemas/scorecard";

export const POST = apiHandler(async (req) => {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to generate a scorecard");
  }
  const userId = session.user.id;

  // 2. Parse + validate request body
  let body: any;
  try {
    body = await req.json();
  } catch (error) {
    throw new ValidationError("Invalid JSON request body");
  }

  const channelId = body.channelId?.trim();
  if (!channelId) {
    throw new ValidationError("Channel ID is required", "channelId");
  }

  // Check Redis command usage limits
  const redisUsage = await getCurrentRedisUsage();
  if (redisUsage.paused) {
    throw new QuotaError("Scorecard generation is temporarily paused due to monthly system limits. Please try again later.");
  }

  // Enforce AI Rate Limiting (5/min/user)
  await rateLimit(userId, "ai");

  // 3. Check Redis cache (6 hours TTL)
  const cacheKey = `scorecard:${channelId}`;
  const cachedResult = await getCachedAIResult(cacheKey);
  if (cachedResult) {
    return NextResponse.json({
      success: true,
      data: {
        state: "completed",
        result: cachedResult,
      },
    });
  }

  const creditsCost = 5; // Channel Scorecard cost: 5 credits

  // 4. Deduct credits (concurrency safe raw query lock)
  await deductCredits(userId, "channel-scorecard", creditsCost);

  try {
    // 5. Fetch channel data from YouTube API
    // Fetch stats + snippet + uploads playlist in one call
    const channelStats = await getChannelStats(channelId);
    const uploadsPlaylistId = channelStats.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      throw new ValidationError("Could not find uploads playlist for the channel.", "channelId");
    }

    // Fetch the last 20 video IDs from uploads playlist
    const playlistResponse = await getPlaylistItems(uploadsPlaylistId, 20);
    const videoIds = (playlistResponse.items || [])
      .map((item) => item.snippet?.resourceId?.videoId)
      .filter(Boolean) as string[];

    // Batch fetch statistics for these 20 video IDs
    const videosResponse = await getVideosDetailsBatch(videoIds);
    const last20Videos = (videosResponse.items || []).map((video) => ({
      title: video.snippet.title,
      viewCount: parseInt(video.statistics.viewCount || "0", 10),
      likeCount: parseInt(video.statistics.likeCount || "0", 10),
      commentCount: parseInt(video.statistics.commentCount || "0", 10),
      publishedAt: video.snippet.publishedAt,
    }));

    // 6. Compute uploadFrequencyDays
    let uploadFrequencyDays = 7.0; // fallback if channel has 1 or fewer videos
    if (last20Videos.length > 1) {
      const sorted = [...last20Videos].sort(
        (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );
      let totalGapMs = 0;
      for (let i = 1; i < sorted.length; i++) {
        const prevItem = sorted[i - 1]!;
        const currItem = sorted[i]!;
        const prev = new Date(prevItem.publishedAt).getTime();
        const curr = new Date(currItem.publishedAt).getTime();
        totalGapMs += curr - prev;
      }
      const avgGapMs = totalGapMs / (sorted.length - 1);
      uploadFrequencyDays = avgGapMs / (1000 * 60 * 60 * 24);
    }

    // 7. Call buildScorecardPrompt()
    const prompt = buildScorecardPrompt({
      channelId,
      channelName: channelStats.snippet.title,
      subscriberCount: parseInt(channelStats.statistics.subscriberCount || "0", 10),
      totalViews: parseInt(channelStats.statistics.viewCount || "0", 10),
      videoCount: parseInt(channelStats.statistics.videoCount || "0", 10),
      publishedAt: channelStats.snippet.publishedAt,
      uploadFrequencyDays,
      last20Videos,
    });

    // 8. Call Gemini with AbortController timeout: 25 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout: Gemini generation took longer than 25 seconds")), 25000);
    });

    const rawResponse = await Promise.race([
      generateAIContent(prompt),
      timeoutPromise,
    ]);

    // 9. Parse Gemini response
    const cleaned = rawResponse.replace(/^```json\n?|\n?```$/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // 10. Validate with ScorecardSchema
    parsed.generatedAt = new Date().toISOString();
    const validated = ScorecardSchema.parse(parsed);

    // 11. Write to Redis cache (6 hours)
    await getRedis().set(cacheKey, JSON.stringify(validated), "EX", 6 * 60 * 60);

    // 12. Return scorecard JSON to client
    return NextResponse.json({
      success: true,
      data: {
        state: "completed",
        result: validated,
      },
    });
  } catch (error) {
    // Refund credits on any error
    try {
      await addCredits(userId, creditsCost, `Refund: Channel Scorecard generation failure for ${channelId}`);
    } catch (refundError) {
      console.error("Failed to refund credits:", refundError);
    }
    throw error;
  }
});
