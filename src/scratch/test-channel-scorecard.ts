import dotenv from "dotenv";
dotenv.config();
import { prisma } from "../lib/prisma";
import { getRedis } from "../lib/redis";

async function main() {
  const channelId = "UCBJycsmduvYEL83R_U4JriQ"; // Marques Brownlee Channel ID
  const url = "http://localhost:3000/api/scorecard";

  console.log("=== CHANNEL SCORECARD VERIFICATION TEST ===");

  // Find the first user to check their initial credits
  const firstUser = await prisma.user.findFirst({ select: { id: true, email: true, credits: true } });
  if (!firstUser) {
    console.error("No users found in database!");
    return;
  }
  console.log(`Testing using database user: ${firstUser.email} (ID: ${firstUser.id})`);
  const initialCredits = firstUser.credits;
  console.log(`Initial User Credits: ${initialCredits}`);

  // Clear any existing cache for this channel
  const cacheKey = `scorecard:${channelId}`;
  await getRedis().del(cacheKey);
  console.log("Cleared Redis cache for key:", cacheKey);

  // --- RUN 1: Cache Miss / Generation ---
  console.log("\n--- REQUEST 1: Cache Miss / Calling Gemini ---");
  const startTime1 = Date.now();
  try {
    const res1 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });

    const json1 = await res1.json();
    const duration1 = Date.now() - startTime1;
    console.log(`Status: ${res1.status} | Duration: ${duration1}ms`);
    console.log("Response Body (Truncated):", JSON.stringify(json1, null, 2).substring(0, 1000) + "...\n");

    if (!res1.ok) {
      throw new Error(`Request 1 failed: ${res1.statusText}`);
    }

    // Check credits after Run 1
    const userAfter1 = await prisma.user.findUnique({
      where: { id: firstUser.id },
      select: { credits: true },
    });
    console.log(`User Credits after Request 1: ${userAfter1?.credits}`);
    const deducted = initialCredits - (userAfter1?.credits || 0);
    console.log(`Deducted Credits: ${deducted} (Expected: 5)`);

    // --- RUN 2: Cache Hit ---
    console.log("\n--- REQUEST 2: Cache Hit ---");
    const startTime2 = Date.now();
    const res2 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });

    const json2 = await res2.json();
    const duration2 = Date.now() - startTime2;
    console.log(`Status: ${res2.status} | Duration: ${duration2}ms`);
    console.log("Response Body (Truncated):", JSON.stringify(json2, null, 2).substring(0, 1000) + "...\n");

    if (!res2.ok) {
      throw new Error(`Request 2 failed: ${res2.statusText}`);
    }

    // Check credits after Run 2
    const userAfter2 = await prisma.user.findUnique({
      where: { id: firstUser.id },
      select: { credits: true },
    });
    console.log(`User Credits after Request 2: ${userAfter2?.credits}`);
    const deducted2 = (userAfter1?.credits || 0) - (userAfter2?.credits || 0);
    console.log(`Deducted Credits in Request 2: ${deducted2} (Expected: 0 - served from cache)`);

  } catch (err: any) {
    console.error("Test execution failed:", err.message);
  } finally {
    await prisma.$disconnect();
    await getRedis().quit();
  }
}

main();
