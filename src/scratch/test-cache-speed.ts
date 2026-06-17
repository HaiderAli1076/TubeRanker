/* eslint-disable no-console */
import "dotenv/config";
import { getKeywordSuggestions } from "../lib/youtube";
import { getRedis } from "../lib/redis";

async function runCacheTest() {
  console.log("Starting Cache Effectiveness Test...");
  const query = `test-query-${Date.now()}`;

  // Ensure key doesn't exist in Redis beforehand so first call is guaranteed to be a MISS
  const cacheKey = `yt:keyword:${query}`;
  await getRedis().del(cacheKey);

  // 1. First Call: Cache MISS (hits YouTube Data API v3)
  console.log(`\nExecuting first call for "${query}" (Expected: Cache MISS)...`);
  const start1 = Date.now();
  const res1 = await getKeywordSuggestions(query);
  const duration1 = Date.now() - start1;
  console.log(`First call completed in: ${duration1}ms`);
  console.log(`Suggestions returned: ${res1.suggestions?.length || 0}`);

  // 2. Second Call: Cache HIT (hits Redis cache)
  console.log(`\nExecuting second call for "${query}" immediately (Expected: Cache HIT)...`);
  const start2 = Date.now();
  const res2 = await getKeywordSuggestions(query);
  const duration2 = Date.now() - start2;
  console.log(`Second call completed in: ${duration2}ms`);
  console.log(`Suggestions returned: ${res2.suggestions?.length || 0}`);

  console.log("\n==========================================");
  if (duration2 < 50) {
    console.log(`🎉 SUCCESS: Caching is highly effective!`);
    console.log(`Cache HIT (${duration2}ms) is ${Math.round(duration1 / duration2)}x faster than API fetch (${duration1}ms).`);
  } else {
    console.warn(`⚠️ WARNING: Second call took longer than expected (${duration2}ms).`);
  }

  // Cleanup Redis test key
  await getRedis().del(cacheKey);
  
  // Close connection pool
  await getRedis().quit();
}

runCacheTest().catch((err) => {
  console.error("Cache test crashed:", err);
  process.exit(1);
});
