/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { Queue, Worker } from "bullmq";
import type { Job } from "bullmq";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

// Setup Redis connection options for BullMQ
const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || "6379", 10),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
};

logger.info("Initializing Credit Reset Queue & Worker...");

// Initialize Queue
const creditResetQueue = new Queue("credit-resets", { connection });

// Initialize Worker
const worker = new Worker(
  "credit-resets",
  async (job: Job) => {
    logger.info(`Starting execution of job: ${job.name} (ID: ${job.id})`);

    if (job.name === "reset-user-credits") {
      const { userId } = job.data;
      if (!userId) {
        throw new Error("Missing userId in job data");
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      let targetCredits = 10; // Default Free plan credits

      if (user.stripePriceId) {
        // Map price ID to target credits
        if (user.stripePriceId.includes("pro")) {
          targetCredits = 100;
        } else if (user.stripePriceId.includes("agency")) {
          targetCredits = 500;
        }
      }

      const oldCredits = user.credits;
      const creditDifference = targetCredits - oldCredits;

      // Justification: tx is cast as any to bypass complex nested client transaction typecheck errors on update operation.
      await prisma.$transaction(async (tx: any) => {
        await tx.user.update({
          where: { id: userId },
          data: { credits: targetCredits },
        });

        await tx.creditLedger.create({
          data: {
            userId,
            amount: creditDifference,
            description: `Monthly billing cycle reset (adjusted from ${oldCredits} to ${targetCredits})`,
          },
        });
      });

      logger.info(`Successfully reset user ${userId} credits from ${oldCredits} to ${targetCredits}`);
    } else if (job.name === "monthly-cycle-reset") {
      // Find all users to queue their individual resets
      const users = await prisma.user.findMany({
        select: { id: true },
      });

      logger.info(`Monthly cycle reset triggered. Queueing resets for ${users.length} users...`);

      for (const user of users) {
        await creditResetQueue.add("reset-user-credits", { userId: user.id });
      }

      logger.info(`Finished queueing resets for ${users.length} users.`);
    } else {
      throw new Error(`Unknown job name: ${job.name}`);
    }
  },
  { connection }
);

// Register event listeners
worker.on("completed", (job) => {
  logger.info(`Job completed: ${job.name} (ID: ${job.id})`);
});

worker.on("failed", (job, err) => {
  logger.error("Credit reset job failed execution", {
    jobId: job?.id,
    jobName: job?.name,
    error: err.message,
    stack: err.stack,
  });
});

worker.on("error", (error) => {
  logger.error("BullMQ worker encountered an error", { error });
});

// Setup repeatable/recurring cron job (monthly reset at 00:00 on the 1st of every month)
async function setupCron() {
  try {
    // Clear existing repeatable jobs to avoid duplicates
    const repeatableJobs = await creditResetQueue.getRepeatableJobs();
    for (const rJob of repeatableJobs) {
      await creditResetQueue.removeRepeatableByKey(rJob.key);
    }

    // Add new repeatable cron job
    await creditResetQueue.add(
      "monthly-cycle-reset",
      {},
      {
        repeat: {
          pattern: "0 0 1 * *", // 1st of month at midnight
        },
      }
    );

    logger.info("Successfully scheduled monthly credit reset cron job.");
  } catch (error) {
    logger.error("Failed to setup monthly credit reset cron job", { error });
  }
}

setupCron();
