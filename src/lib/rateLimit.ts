import { getRedis, incrementCommands } from "./redis";
import { RateLimitError } from "./errors";
import { logger } from "./logger";

/**
 * Sliding window rate limiter using Redis.
 * - General limits: 100 requests per minute per IP.
 * - Auth limits (applied to /api/auth/* and /login): 10 requests per minute per IP.
 */
export async function rateLimit(
  ip: string,
  type: "general" | "auth" | "ai"
): Promise<void> {
  const windowMs = 60 * 1000; // 1 minute sliding window
  const limit = type === "auth" ? 10 : type === "ai" ? 5 : 100;

  const now = Date.now();
  const key = `ratelimit:${type}:${ip}`;
  const clearBefore = now - windowMs;

  try {
    const multi = getRedis().multi();
    // Remove timestamps older than the sliding window
    multi.zremrangebyscore(key, 0, clearBefore);
    // Add the current request timestamp
    multi.zadd(key, now, `${now}-${Math.random()}`);
    // Count total requests within this window
    multi.zcard(key);
    // Refresh expiration of the set
    multi.pexpire(key, windowMs);

    const results = await multi.exec();
    incrementCommands(6); // MULTI + zremrangebyscore + zadd + zcard + pexpire + EXEC
    if (!results) {
      throw new Error("Rate limit transaction failed");
    }

    // exec returns array of [error, result]
    const zcardResult = results[2];
    const count = zcardResult && zcardResult[0] === null ? (zcardResult[1] as number) : 0;

    if (count > limit) {
      // Find the oldest request in the window to calculate retry-after
      incrementCommands(1);
      const oldestTimestamps = await getRedis().zrange(key, 0, 0, "WITHSCORES");
      let oldestTime = now - windowMs;
      if (oldestTimestamps.length >= 2) {
        oldestTime = parseFloat(oldestTimestamps[1] || "0");
      }
      const retryAfterSeconds = Math.ceil((oldestTime + windowMs - now) / 1000);
      const retryAfter = retryAfterSeconds > 0 ? retryAfterSeconds : 1;

      logger.warn("Rate limit exceeded", { ip, type, count, limit, retryAfter });
      throw new RateLimitError("Too many requests. Please try again later.", retryAfter);
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    logger.error("Rate limiter Redis failure, passing request through to prevent service disruption", { ip, type, error });
  }
}
