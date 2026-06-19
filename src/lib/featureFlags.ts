import { prisma } from "./prisma";
import { getRedis, incrementCommands } from "./redis";
import { logger } from "./logger";

export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  const cacheKey = `feature-flag:${key}`;

  try {
    incrementCommands(1);
    const cachedValue = await getRedis().get(cacheKey);
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
      incrementCommands(1);
      await getRedis().setex(cacheKey, 60, isEnabled ? "true" : "false");
    } catch (cacheError) {
      logger.warn("Failed to set feature flag in Redis cache", { key, cacheError, userId });
    }

    return isEnabled;
  } catch (error) {
    logger.error("Failed to fetch feature flag from database", { key, error, userId });
    return false;
  }
}

export async function setFeatureFlag(
  key: string,
  isEnabled: boolean,
  description?: string
): Promise<void> {
  const cacheKey = `feature-flag:${key}`;

  try {
    await prisma.featureFlag.upsert({
      where: { key },
      update: { isEnabled, description },
      create: { key, isEnabled, description },
    });

    try {
      incrementCommands(1);
      await getRedis().setex(cacheKey, 60, isEnabled ? "true" : "false");
    } catch (cacheError) {
      logger.warn("Failed to set feature flag in Redis cache during update", { key, cacheError });
    }
  } catch (error) {
    logger.error("Failed to update feature flag in database", { key, error });
    throw error;
  }
}
