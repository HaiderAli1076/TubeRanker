/* eslint-disable no-console */
import "dotenv/config";
import { getVideoDetails } from "../lib/youtube";
import { generateAIContent } from "../lib/ai/gemini";
import { scorecardPrompts } from "../lib/ai/prompts/v1/prompts";
import { scorecardSchema, parseAIOutput } from "../lib/ai/schemas";
import { calculateOverallScore, SCORE_WEIGHTS } from "../lib/ai/scorecard";
import { getRedis } from "../lib/redis";

async function runScorecardSanityTest() {
  console.log("--------------------------------------------------");
  console.log("RUNNING SCORECARD SANITY TEST AGAINST dQw4w9WgXcQ");
  console.log("--------------------------------------------------\n");

  const videoId = "dQw4w9WgXcQ";

  // 1. Fetch video metadata
  console.log(`Step 1: Fetching video details from YouTube for ID: ${videoId}...`);
  const video = await getVideoDetails(videoId);
  console.log(`✅ YouTube Fetch Success!`);
  console.log(`   Title: "${video.snippet.title}"`);
  console.log(`   Description Length: ${video.snippet.description?.length || 0} characters`);
  console.log(`   Tags Count: ${video.snippet.tags?.length || 0}`);
  console.log(`   Thumbnail URL: ${video.snippet.thumbnails?.high?.url || "N/A"}\n`);

  // 2. Call AI/Mock provider
  console.log("Step 2: Requesting SEO Audit from Gemini Mock Provider...");
  const systemPrompt = scorecardPrompts.system;
  const userPrompt = scorecardPrompts.user(
    video.snippet.title,
    video.snippet.description || "",
    video.snippet.tags?.join(", ") || "",
    video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url
  );

  const rawResponse = await generateAIContent(userPrompt, systemPrompt);
  console.log("✅ Gemini Mock Response Received.\n");

  // 3. Parse output
  console.log("Step 3: Parsing response with Zod scorecardSchema...");
  const parsed = parseAIOutput(rawResponse, scorecardSchema);
  console.log("✅ Zod Parsing Success!\n");

  // 4. Calculate score using SCORE_WEIGHTS
  console.log("Step 4: Applying SCORE_WEIGHTS to calculate overall score...");
  console.log("Defined SCORE_WEIGHTS:", SCORE_WEIGHTS);
  
  const overallScore = calculateOverallScore({
    title: parsed.titleScore,
    description: parsed.descriptionScore,
    tags: parsed.tagsScore,
    thumbnail: parsed.thumbnailScore,
  });

  console.log("\n---------------- RESULTS ----------------");
  console.log(`Title Subscore:       ${parsed.titleScore} (Weight: ${SCORE_WEIGHTS.title})`);
  console.log(`Description Subscore: ${parsed.descriptionScore} (Weight: ${SCORE_WEIGHTS.description})`);
  console.log(`Tags Subscore:        ${parsed.tagsScore} (Weight: ${SCORE_WEIGHTS.tags})`);
  console.log(`Thumbnail Subscore:   ${parsed.thumbnailScore} (Weight: ${SCORE_WEIGHTS.thumbnail})`);
  console.log(`-----------------------------------------`);
  console.log(`OVERALL SCORE:        ${overallScore} / 100`);
  console.log("-----------------------------------------\n");

  // Assertions
  if (overallScore === 0) {
    console.error("❌ ERROR: Overall score is 0. Scoring pipeline failed.");
    process.exit(1);
  }
  if (overallScore === 100) {
    console.error("❌ ERROR: Overall score is 100. Check weighting calculation.");
    process.exit(1);
  }

  if (overallScore >= 60 && overallScore <= 95) {
    console.log("✅ SANITY TEST PASSED: Score is within the acceptable 60-95 range!");
  } else {
    console.error(`❌ SANITY TEST FAILED: Score ${overallScore} is outside the 60-95 range!`);
    process.exit(1);
  }

  // Clean connection
  await getRedis().quit();
  process.exit(0);
}

runScorecardSanityTest().catch((err) => {
  console.error("Sanity test crashed:", err);
  process.exit(1);
});
