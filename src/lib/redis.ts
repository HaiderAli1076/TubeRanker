import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

let _redis: Redis | undefined;

// Batching configuration for Redis command tracking
let pendingCommands = 0;
let flushTimeout: NodeJS.Timeout | null = null;
let isFlushing = false;

/**
 * Increments the pending commands counter and schedules a flush to Postgres.
 */
export function incrementCommands(count: number) {
  pendingCommands += count;
  
  if (pendingCommands >= 100) {
    flushPendingCommands();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushPendingCommands();
    }, 30000); // 30 seconds
  }
}

/**
 * Flushes the accumulated Redis commands count to Postgres.
 */
async function flushPendingCommands() {
  if (pendingCommands === 0 || isFlushing) {
    return;
  }
  
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  
  const countToFlush = pendingCommands;
  pendingCommands = 0;
  isFlushing = true;
  
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-06"
    // Dynamic import to avoid circular dependency with prisma.ts
    const { prisma } = await import("./prisma");
    await prisma.redisUsage.upsert({
      where: { key: currentMonth },
      update: { count: { increment: countToFlush } },
      create: { key: currentMonth, count: countToFlush },
    });
  } catch (error) {
    // Restore the pending commands on failure so they aren't lost
    pendingCommands += countToFlush;
    logger.error("Failed to flush Redis usage to Postgres", { error });
  } finally {
    isFlushing = false;
    
    // If commands accumulated during flush, reschedule
    if (pendingCommands > 0 && !flushTimeout) {
      flushTimeout = setTimeout(() => {
        flushPendingCommands();
      }, 30000);
    }
  }
}

export async function getCurrentRedisUsage(): Promise<{
  used: number;
  limit: number;
  threshold: number;
  percentage: number;
  paused: boolean;
}> {
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-06"
  const { prisma } = await import("./prisma");
  
  try {
    const record = await prisma.redisUsage.findUnique({
      where: { key: currentMonth },
    });
    
    const used = (record?.count ?? 0) + pendingCommands;
    const limit = 500000;
    const threshold = 320000;
    const percentage = Number(((used / limit) * 100).toFixed(2));
    const paused = used >= threshold;
    
    return {
      used,
      limit,
      threshold,
      percentage,
      paused,
    };
  } catch (error) {
    logger.warn("Failed to retrieve current Redis usage from database. Failing open (paused: false) to allow AI features to proceed.", { error });
    return {
      used: pendingCommands,
      limit: 500000,
      threshold: 320000,
      percentage: Number(((pendingCommands / 500000) * 100).toFixed(2)),
      paused: false,
    };
  }
}

export function getRedis(): Redis {
  if (globalForRedis.redis) {
    return globalForRedis.redis;
  }
  if (_redis) {
    return _redis;
  }

  let redisUrl = env.REDIS_URL;
  if (redisUrl.startsWith("redis://") && redisUrl.includes(".upstash.io")) {
    redisUrl = redisUrl.replace("redis://", "rediss://");
  }

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) {
        logger.error("Redis client connection failed after 10 attempts. Stopping retries.");
        return null;
      }
      const delay = Math.min(Math.pow(2, times) * 100, 5000);
      return delay;
    },
  });

  client.on("error", (error) => {
    logger.error("Redis client connection error", { error });
  });

  client.on("connect", () => {
    logger.info("Successfully connected to Redis");
  });

  if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = client;
  } else {
    _redis = client;
  }

  return client;
}

export default getRedis;

