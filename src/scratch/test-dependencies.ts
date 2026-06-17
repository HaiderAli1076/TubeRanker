/* eslint-disable no-console */
import "dotenv/config";
import { getKeywordSuggestions } from "../lib/youtube";
import { generateAIContent } from "../lib/ai/gemini";
import { getRedis } from "../lib/redis";

async function verifyDependencies() {
  console.log("Verifying YouTube Data API Integration...");
  try {
    const query = "saas";
    const res = await getKeywordSuggestions(query);
    console.log("✅ YouTube API Success!");
    console.log(`Keyword: ${res.keyword}`);
    console.log(`Volume: ${res.volume}`);
    console.log(`Suggestions count: ${res.suggestions?.length || 0}`);
  } catch (error) {
    console.error("❌ YouTube API Failed:", error);
    process.exit(1);
  }

  console.log("\nVerifying Gemini AI Integration...");
  try {
    const prompt = "Respond with a simple JSON object containing a 'greeting' key: { \"greeting\": \"hello from gemini\" }";
    const result = await generateAIContent(prompt);
    console.log("✅ Gemini AI Success!");
    console.log("Response:", result);
  } catch (error) {
    console.error("❌ Gemini AI Failed:", error);
    process.exit(1);
  }

  // Cleanup connections
  await getRedis().quit();
  console.log("\n🎉 ALL DEPENDENCY CHECKS PASSED!");
  process.exit(0);
}

verifyDependencies().catch((err) => {
  console.error("Verification crashed:", err);
  process.exit(1);
});
