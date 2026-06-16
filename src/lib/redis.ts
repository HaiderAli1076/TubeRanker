import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
  });

redis.on("error", (error) => {
  logger.error("Redis client connection error", { error });
});

redis.on("connect", () => {
  logger.info("Successfully connected to Redis");
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
export default redis;
