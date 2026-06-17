/* eslint-disable @typescript-eslint/no-explicit-any */
import { Queue } from "bullmq";
import Redis from "ioredis";
import { env } from "../env";
import { deductCredits } from "../credits";
import { tenantStorage } from "../prisma";
import { logger } from "../logger";

const globalForQueues = globalThis as unknown as {
  queueRedisConnection: Redis | undefined;
  queues: {
    readonly high: Queue;
    readonly medium: Queue;
    readonly low: Queue;
  } | undefined;
};

let _queueRedisConnection: Redis | null = null;
let _queues: {
  readonly high: Queue;
  readonly medium: Queue;
  readonly low: Queue;
} | null = null;

// BullMQ connection must set maxRetriesPerRequest to null
export function getQueueRedisConnection(): Redis {
  if (globalForQueues.queueRedisConnection) {
    return globalForQueues.queueRedisConnection;
  }
  if (_queueRedisConnection) {
    return _queueRedisConnection;
  }
  const conn = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 10) {
        logger.error("Queue Redis connection failed after 10 attempts. Stopping retries.");
        return null;
      }
      const delay = Math.min(Math.pow(2, times) * 100, 5000);
      return delay;
    },
  });
  if (process.env.NODE_ENV !== "production") {
    globalForQueues.queueRedisConnection = conn;
  } else {
    _queueRedisConnection = conn;
  }
  return conn;
}

export function getQueues() {
  if (globalForQueues.queues) {
    return globalForQueues.queues;
  }
  if (_queues) {
    return _queues;
  }
  const conn = getQueueRedisConnection();
  const instances = {
    high: new Queue("ai-high", { connection: conn as any }),
    medium: new Queue("ai-medium", { connection: conn as any }),
    low: new Queue("ai-low", { connection: conn as any }),
  } as const;
  if (process.env.NODE_ENV !== "production") {
    globalForQueues.queues = instances;
  } else {
    _queues = instances;
  }
  return instances;
}

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

  const queue = getQueues()[priority];
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
