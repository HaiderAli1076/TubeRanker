import { prisma } from "./prisma";
import { redis } from "./redis";
import { logger } from "./logger";

export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  const cacheKey = `feature-flag:${key}`;

  try {
    const cachedValue = await redis.get(cacheKey);
    if (cachedValue !== null) {
      return cachedValue === "true";
    }
  } catch (error) {
    logger.warn("Failed to get feature flag from Redis cache, falling back to database", { key, error, userId });
  }

  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    const isEnabled = flag?.isEnabled ?? false;

    try {
      await redis.setex(cacheKey, 60, isEnabled ? "true" : "false");
    } catch (cacheError) {
      logger.warn("Failed to set feature flag in Redis cache", { key, cacheError, userId });
    }

    return isEnabled;
  } catch (error) {
    logger.error("Failed to fetch feature flag from database", { key, error, userId });
    return false;
  }
}
