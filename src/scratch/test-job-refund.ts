/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { prisma } from "../lib/prisma";
import { addCredits, deductCredits } from "../lib/credits";
import { env } from "../lib/env";

const redisUrl = env.REDIS_URL;
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

async function runRefundTest() {
  console.log("Starting Credit Refund Verification Test...");

  // 1. Create a temp test user with 10 credits
  const userEmail = `refund-test-${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: userEmail,
      name: "Refund Tester",
      credits: 10,
    },
  });
  console.log(`Created test user: ${user.id} with credits: ${user.credits}`);

  // 2. Setup a test queue
  const queueName = `test-refund-${Date.now()}`;
  const testQueue = new Queue(queueName, { connection: connection as any });

  // 3. Deduct credits first
  const creditCost = 3;
  await deductCredits(user.id, "seo-audit", creditCost);
  
  const userAfterDeduction = await prisma.user.findUnique({ where: { id: user.id } });
  console.log(`Deducted ${creditCost} credits. Current balance: ${userAfterDeduction?.credits}`);

  // 4. Add the job to the test queue
  await testQueue.add("fail-job", {
    userId: user.id,
    tool: "seo-audit",
    credits: creditCost,
  });

  // 5. Setup the worker with failed listener (exactly as in aiWorker.ts)
  const testWorker = new Worker(queueName, async (job) => {
    console.log(`Processing job ${job.id} - Simulating Gemini timeout failure...`);
    throw new Error("Mock Gemini Timeout Error");
  }, { connection: connection as any });

  // 6. Wait for job to fail and confirm refund
  await new Promise((resolve) => {
    // Event listener identical to worker:ai failed listener
    testWorker.on("failed", async (job) => {
      if (job) {
        console.log(`Job failed. Triggering refund for ${job.data.credits} credits...`);
        await addCredits(job.data.userId, job.data.credits, `Refund: AI job failure for ${job.data.tool}`);
        console.log("Refund complete!");
        
        // Small delay to let database write finish
        setTimeout(async () => {
          const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
          console.log(`Final user credits: ${finalUser?.credits}`);
          
          // Assertions
          if (finalUser?.credits === 10) {
            console.log("✅ SUCCESS: Credits were successfully refunded on job failure!");
            
            // Cleanup
            await prisma.user.delete({ where: { id: user.id } });
            await testWorker.close();
            await testQueue.close();
            await connection.quit();
            resolve(true);
          } else {
            console.error(`❌ FAIL: Expected 10 credits, got ${finalUser?.credits}`);
            process.exit(1);
          }
        }, 1000);
      }
    });
  });
}

runRefundTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
