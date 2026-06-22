import { env } from "./env";
import { getRedis, incrementCommands } from "./redis";
import { QuotaError, YouTubeError } from "./errors";
import { logger } from "./logger";

// Standard daily quota cache key pattern and client cache keys mapping
export const CACHE_KEYS = {
  channelStats: (id: string) => `yt:channel:${id}`,
  searchResults: (q: string) => `yt:search:${q}`,
  keywordSuggestions: (q: string) => `yt:keyword:${q}`,
  channelVideos: (id: string, limit: number, pageToken: string) => `yt:channel-videos:${id}:${limit}:${pageToken}`,
  videoDetails: (id: string) => `yt:video:${id}`,
} as const;

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const DEFAULT_CACHE_TTL = 86400; // 24 hours in seconds

/**
 * Tracks daily YouTube API consumption.
 * Resets automatically at midnight UTC using Redis expiration.
 */
export async function checkAndIncrementQuota(cost: number): Promise<void> {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const key = `youtube:quota:${dateStr}`;

  // Increment consumption by cost
  incrementCommands(1);
  const currentQuota = await getRedis().incrby(key, cost);

  // Set expiration to midnight UTC on the first request of the day
  if (currentQuota === cost) {
    const midnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    const secondsUntilMidnight = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
    incrementCommands(1);
    await getRedis().expire(key, secondsUntilMidnight);
    logger.info(`Initialized daily YouTube quota tracking for ${dateStr}. Expires in ${secondsUntilMidnight}s.`);
  }

  // Enforce YouTube daily default quota limit (10,000 units)
  const QUOTA_LIMIT = 10000;
  if (currentQuota > QUOTA_LIMIT) {
    logger.error("YouTube API quota exceeded for the day", { currentQuota, limit: QUOTA_LIMIT });
    throw new QuotaError("YouTube API daily quota limit reached");
  }
}

/**
 * Helper to fetch from cache or execute external API call.
 */
async function getCachedOrFetch<T>(
  cacheKey: string,
  cost: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Check cache first
  incrementCommands(1);
  const cached = await getRedis().get(cacheKey);
  if (cached) {
    logger.info("YouTube cache HIT", { cacheKey });
    return JSON.parse(cached) as T;
  }

  logger.info("YouTube cache MISS, checking quota...", { cacheKey, cost });
  // Verify and increment quota before making the API request
  await checkAndIncrementQuota(cost);

  // Execute actual API call
  const data = await fetchFn();

  // Save to cache
  incrementCommands(1);
  await getRedis().set(cacheKey, JSON.stringify(data), "EX", DEFAULT_CACHE_TTL);
  return data;
}

export interface YoutubeChannelItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails?: {
      default?: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
    hiddenSubscriberCount: boolean;
  };
  contentDetails?: {
    relatedPlaylists: {
      uploads: string;
    };
  };
}

export interface YoutubeVideoSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
    };
  }>;
}

export interface KeywordSuggestionsResponse {
  keyword: string;
  volume: number;
  suggestions: Array<{
    keyword: string;
    volume: number;
  }>;
}

interface SuggestionSearchItem {
  snippet?: {
    title?: string;
  };
}

/**
 * Search keywords / videos.
 * Cost: 100 units.
 */
export async function searchVideos(query: string): Promise<unknown> {
  const cacheKey = CACHE_KEYS.searchResults(query);
  return getCachedOrFetch(cacheKey, 100, async () => {
    const url = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${env.YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new YouTubeError(`YouTube search failed: ${errorText}`);
    }
    return response.json();
  });
}

/**
 * Get channel statistics.
 * Cost: 1 unit.
 */
export async function getChannelStats(channelId: string): Promise<YoutubeChannelItem> {
  const cacheKey = CACHE_KEYS.channelStats(channelId);
  return getCachedOrFetch<YoutubeChannelItem>(cacheKey, 1, async () => {
    const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${env.YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new YouTubeError(`YouTube channel fetch failed: ${errorText}`);
    }
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new YouTubeError("Channel not found in YouTube Data API");
    }
    return data.items[0] as YoutubeChannelItem;
  });
}

/**
 * Get channel uploads / videos.
 * Cost: 100 units.
 */
export async function getChannelVideos(
  channelId: string,
  limit = 10,
  pageToken = ""
): Promise<YoutubeVideoSearchResponse> {
  const cacheKey = CACHE_KEYS.channelVideos(channelId, limit, pageToken);
  return getCachedOrFetch<YoutubeVideoSearchResponse>(cacheKey, 100, async () => {
    let url = `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${limit}&key=${env.YOUTUBE_API_KEY}`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new YouTubeError(`YouTube channel video search failed: ${errorText}`);
    }
    return response.json() as Promise<YoutubeVideoSearchResponse>;
  });
}

/**
 * Suggests related search terms and computes a mock search volume.
 * Cost: 100 units.
 */
export async function getKeywordSuggestions(query: string): Promise<KeywordSuggestionsResponse> {
  const cacheKey = CACHE_KEYS.keywordSuggestions(query);
  return getCachedOrFetch<KeywordSuggestionsResponse>(cacheKey, 100, async () => {
    const url = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=5&key=${env.YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new YouTubeError(`YouTube search suggestions failed: ${errorText}`);
    }
    const data = await response.json();

    // Map YouTube search results to simulated keyword search volumes for analytics dashboard
    const resultsCount = data.pageInfo?.totalResults || 0;
    const baseVolume = Math.min(Math.max(resultsCount * 7, 250), 95000); // map search volume

    const suggestions = ((data.items || []) as SuggestionSearchItem[]).map((item) => ({
      keyword: item.snippet?.title || "",
      volume: Math.round(baseVolume * (0.3 + Math.random() * 0.7)),
    }));

    return {
      keyword: query,
      volume: Math.round(baseVolume),
      suggestions,
    };
  });
}

export interface YoutubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    tags?: string[];
    thumbnails?: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
      standard?: { url: string };
      maxres?: { url: string };
    };
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

/**
 * Get YouTube video details (snippet, statistics).
 * Cost: 1 unit.
 */
export async function getVideoDetails(videoId: string): Promise<YoutubeVideoItem> {
  const cacheKey = CACHE_KEYS.videoDetails(videoId);
  return getCachedOrFetch<YoutubeVideoItem>(cacheKey, 1, async () => {
    const url = `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&id=${videoId}&key=${env.YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new YouTubeError(`YouTube video details fetch failed: ${errorText}`);
    }
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new YouTubeError("Video not found in YouTube Data API");
    }
    return data.items[0] as YoutubeVideoItem;
  });
}

export interface YoutubePlaylistItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    resourceId?: {
      videoId?: string;
    };
  };
}

export interface YoutubePlaylistResponse {
  items: YoutubePlaylistItem[];
}

export async function getPlaylistItems(
  playlistId: string,
  limit = 20
): Promise<YoutubePlaylistResponse> {
  const cacheKey = `yt:playlist-items:${playlistId}:${limit}`;
  return getCachedOrFetch<YoutubePlaylistResponse>(cacheKey, 1, async () => {
    const url = `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${limit}&key=${env.YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new YouTubeError(`YouTube playlistItems fetch failed: ${errorText}`);
    }
    return response.json() as Promise<YoutubePlaylistResponse>;
  });
}

export async function getVideosDetailsBatch(
  videoIds: string[]
): Promise<{ items: YoutubeVideoItem[] }> {
  if (videoIds.length === 0) {
    return { items: [] };
  }
  const cacheKey = `yt:videos-batch:${videoIds.join(",")}`;
  return getCachedOrFetch<{ items: YoutubeVideoItem[] }>(cacheKey, 1, async () => {
    const url = `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${env.YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new YouTubeError(`YouTube videos batch fetch failed: ${errorText}`);
    }
    return response.json() as Promise<{ items: YoutubeVideoItem[] }>;
  });
}

