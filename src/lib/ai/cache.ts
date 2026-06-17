import crypto from "crypto";
import { getRedis } from "../redis";
import { logger } from "../logger";

const MAX_IDEMPOTENCY_SIZE = 100 * 1024; // 100KB limit

/**
 * Generates a Redis cache key for AI results based on the tool and input variables.
 */
export function generateCacheKey(tool: string, inputs: Record<string, unknown>): string {
  const serialized = JSON.stringify(inputs);
  const hash = crypto.createHash("sha256").update(serialized).digest("hex");
  return `ai:cache:${tool}:${hash}`;
}

/**
 * Gets a cached AI result if it exists.
 */
export async function getCachedAIResult(key: string): Promise<unknown | null> {
  const cached = await getRedis().get(key);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch (error) {
    logger.error("Failed to parse cached AI result JSON", { key, error });
    return null;
  }
}

/**
 * Caches an AI result. Default TTL is 3 days (within the 1-7 days requirement).
 */
export async function setCachedAIResult(
  key: string,
  data: unknown,
  ttlDays = 3
): Promise<void> {
  const ttlSeconds = ttlDays * 24 * 60 * 60;
  try {
    await getRedis().set(key, JSON.stringify(data), "EX", ttlSeconds);
    logger.info("AI result successfully cached", { key, ttlDays });
  } catch (error) {
    logger.error("Failed to cache AI result in Redis", { key, error });
  }
}

/**
 * Stores a response under an idempotency key if it fits within the 100KB limit.
 */
export async function saveToIdempotency(key: string, data: unknown): Promise<void> {
  try {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_IDEMPOTENCY_SIZE) {
      logger.warn("Oversized response skipped from idempotency caching", {
        key,
        sizeBytes: serialized.length,
        limitBytes: MAX_IDEMPOTENCY_SIZE,
      });
      return;
    }
    // Cache the response for 24 hours (86,400 seconds)
    await getRedis().set(`idempotency:${key}`, serialized, "EX", 24 * 60 * 60);
    logger.info("Idempotency response cached successfully", { key, sizeBytes: serialized.length });
  } catch (error) {
    logger.error("Failed to save idempotency response in Redis", { key, error });
  }
}

/**
 * Retrieves an idempotent response by its key.
 */
export async function getIdempotentResponse(key: string): Promise<unknown | null> {
  const value = await getRedis().get(`idempotency:${key}`);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    logger.error("Failed to parse idempotent response JSON", { key, error });
    return null;
  }
}
