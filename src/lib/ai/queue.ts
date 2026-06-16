/* eslint-disable @typescript-eslint/no-explicit-any */
import { Queue } from "bullmq";
import Redis from "ioredis";
import { env } from "../env";
import { deductCredits } from "../credits";
import { tenantStorage } from "../prisma";

// BullMQ connection must set maxRetriesPerRequest to null
export const queueRedisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const queues = {
  high: new Queue("ai-high", { connection: queueRedisConnection as any }),
  medium: new Queue("ai-medium", { connection: queueRedisConnection as any }),
  low: new Queue("ai-low", { connection: queueRedisConnection as any }),
} as const;

export type JobPriority = "high" | "medium" | "low";

/**
 * Deducts user credits and submits a job to the priority BullMQ queues.
 */
export async function addAIJob(
  userId: string,
  tool: string,
  inputs: Record<string, unknown>,
  creditsCost: number,
  priority: JobPriority
): Promise<string> {
  // Deduct credits first; will throw QuotaError if insufficient
  await deductCredits(userId, tool, creditsCost);

  const store = tenantStorage.getStore();
  const workspaceId = store?.workspaceId || undefined;

  const queue = queues[priority];
  const job = await queue.add(
    tool,
    {
      userId,
      workspaceId,
      tool,
      inputs,
      credits: creditsCost,
    },
    {
      removeOnComplete: {
        age: 1800, // keep for 30 mins
        count: 100,
      },
      removeOnFail: {
        age: 86400, // keep for 24 hours
        count: 100,
      },
    }
  );

  if (!job.id) {
    throw new Error("Failed to queue AI job");
  }

  return job.id;
}
