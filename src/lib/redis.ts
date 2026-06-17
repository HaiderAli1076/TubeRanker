import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

let _redis: Redis | undefined;

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
        return null; // Return null to halt reconnecting
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
