/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { fileURLToPath } from "url";
import { Worker } from "bullmq";
import type { Job } from "bullmq";
import Redis from "ioredis";
import { env } from "../lib/env";
import { addCredits } from "../lib/credits";
import { generateAIContent } from "../lib/ai/groq";
import { sanitizeInput } from "../lib/sanitize";
import { logger } from "../lib/logger";
import {
  titleGeneratorPrompts,
  descriptionWriterPrompts,
  thumbnailConceptsPrompts,
  contentOutlinePrompts,
  seoAuditPrompts,
  scorecardPrompts,
  competitorGapPrompts,
} from "../lib/ai/prompts/v1/prompts";
import {
  titleGeneratorSchema,
  descriptionWriterSchema,
  thumbnailConceptsSchema,
  contentOutlineSchema,
  seoAuditSchema,
  scorecardSchema,
  competitorGapSchema,
  parseAIOutput,
} from "../lib/ai/schemas";
import { generateCacheKey, setCachedAIResult, getCachedAIResult } from "../lib/ai/cache";
import { getVideoDetails } from "../lib/youtube";
import { calculateOverallScore } from "../lib/ai/scorecard";
import { tenantStorage } from "../lib/prisma";

let _workerRedisConnection: Redis | null = null;

function getWorkerRedisConnection(): Redis {
  if (!_workerRedisConnection) {
    _workerRedisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 10) {
          logger.error("Worker Redis connection failed after 10 attempts. Stopping retries.");
          return null;
        }
        const delay = Math.min(Math.pow(2, times) * 100, 5000);
        return delay;
      },
    });
  }
  return _workerRedisConnection;
}

/**
 * Refund credits to the user if the job fails.
 */
export async function refundCredits(userId: string, tool: string, amount: number): Promise<void> {
  try {
    await addCredits(userId, amount, `Refund: AI job failure for ${tool}`);
    logger.info("Refunded credits to user due to job failure", { userId, tool, amount });
  } catch (error) {
    logger.error("Failed to refund user credits", { userId, tool, amount, error });
  }
}

/**
 * AI Job Processor.
 */
async function processAIJob(job: Job): Promise<unknown> {
  const { userId, workspaceId, tool, inputs } = job.data;
  
  logger.info("Processing AI job", { jobId: job.id, tool, userId, workspaceId });

  return tenantStorage.run({ workspaceId, userId }, async () => {
    // 1. Resolve prompt template, system instruction, and schema
    let systemPrompt = "";
    let userPrompt = "";
    let schema: any;

    const rawInputs = inputs as Record<string, string>;

    switch (tool) {
      case "title-generator":
        systemPrompt = titleGeneratorPrompts.system;
        userPrompt = titleGeneratorPrompts.user(
          sanitizeInput(rawInputs.topic || "", "topic"),
          rawInputs.keywords ? sanitizeInput(rawInputs.keywords, "keywords") : undefined
        );
        schema = titleGeneratorSchema;
        break;

      case "description-writer":
        systemPrompt = descriptionWriterPrompts.system;
        userPrompt = descriptionWriterPrompts.user(
          sanitizeInput(rawInputs.title || "", "title"),
          sanitizeInput(rawInputs.topic || "", "topic")
        );
        schema = descriptionWriterSchema;
        break;

      case "thumbnail-concepts":
        systemPrompt = thumbnailConceptsPrompts.system;
        userPrompt = thumbnailConceptsPrompts.user(
          sanitizeInput(rawInputs.title || "", "title"),
          sanitizeInput(rawInputs.description || "", "description")
        );
        schema = thumbnailConceptsSchema;
        break;

      case "content-outline":
        systemPrompt = contentOutlinePrompts.system;
        userPrompt = contentOutlinePrompts.user(
          sanitizeInput(rawInputs.topic || "", "topic"),
          rawInputs.targetDuration ? sanitizeInput(rawInputs.targetDuration, "targetDuration") : undefined
        );
        schema = contentOutlineSchema;
        break;

      case "seo-audit":
        systemPrompt = seoAuditPrompts.system;
        userPrompt = seoAuditPrompts.user(
          sanitizeInput(rawInputs.title || "", "title"),
          sanitizeInput(rawInputs.description || "", "description"),
          rawInputs.tags ? sanitizeInput(rawInputs.tags, "tags") : undefined
        );
        schema = seoAuditSchema;
        break;

      case "video-scorecard": {
        const videoId = sanitizeInput(rawInputs.videoId || "", "videoId");
        const video = await getVideoDetails(videoId);
        systemPrompt = scorecardPrompts.system;
        userPrompt = scorecardPrompts.user(
          video.snippet.title,
          video.snippet.description || "",
          video.snippet.tags?.join(", ") || "",
          video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url
        );
        schema = scorecardSchema;
        break;
      }

      case "competitor-gap":
        systemPrompt = competitorGapPrompts.system;
        userPrompt = competitorGapPrompts.user(
          sanitizeInput(rawInputs.userChannel || "", "userChannel"),
          sanitizeInput(rawInputs.competitorChannels || "", "competitorChannels")
        );
        schema = competitorGapSchema;
        break;

      default:
        throw new Error(`Unsupported AI tool: ${tool}`);
    }

    // 2. Caching check
    const cacheKey = generateCacheKey(tool, rawInputs);
    const cachedData = await getCachedAIResult(cacheKey);
    if (cachedData) {
      logger.info("AI Cache hit in job worker", { jobId: job.id, cacheKey });
      return cachedData;
    }

    // 3. Request content generation from Gemini
    logger.info("Requesting content generation from Groq API", { jobId: job.id });
    const rawResponse = await generateAIContent(userPrompt, systemPrompt);

    // 4. Strip markdown structures and validate response with Zod schema
    const parsedResponse = parseAIOutput(rawResponse, schema);

    let finalResult: any = parsedResponse;

    if (tool === "video-scorecard") {
      const videoId = sanitizeInput(rawInputs.videoId || "", "videoId");
      const video = await getVideoDetails(videoId);
      const scorecardData = parsedResponse as any;
      const overallScore = calculateOverallScore({
        title: scorecardData.titleScore,
        description: scorecardData.descriptionScore,
        tags: scorecardData.tagsScore,
        thumbnail: scorecardData.thumbnailScore,
      });

      finalResult = {
        videoId,
        videoMetadata: {
          title: video.snippet.title,
          description: video.snippet.description,
          tags: video.snippet.tags || [],
          thumbnails: video.snippet.thumbnails,
          publishedAt: video.snippet.publishedAt,
          statistics: video.statistics,
        },
        subscores: {
          title: scorecardData.titleScore,
          description: scorecardData.descriptionScore,
          tags: scorecardData.tagsScore,
          thumbnail: scorecardData.thumbnailScore,
        },
        overallScore,
        strengths: scorecardData.strengths,
        weaknesses: scorecardData.weaknesses,
        recommendations: scorecardData.recommendations,
      };
    }

    // 5. Save successfully generated and parsed content to Cache
    await setCachedAIResult(cacheKey, finalResult);

    return finalResult;
  });
}

let _workers: Worker[] | null = null;

export function startAIWorkers(): Worker[] {
  if (_workers) {
    return _workers;
  }

  const connection = getWorkerRedisConnection();

  // Instantiate BullMQ Workers for all three priorities
  const highWorker = new Worker("ai-high", processAIJob, { connection: connection as any });
  const mediumWorker = new Worker("ai-medium", processAIJob, { connection: connection as any });
  const lowWorker = new Worker("ai-low", processAIJob, { connection: connection as any });

  const workers = [highWorker, mediumWorker, lowWorker];

  // Attach refund event listeners for all workers
  workers.forEach((worker) => {
    worker.on("failed", async (job, error) => {
      if (job) {
        await refundCredits(job.data.userId, job.data.tool, job.data.credits);
        logger.error("AI job failed, credits refunded", { jobId: job.id, error });
      }
    });

    worker.on("error", (err) => {
      logger.error("BullMQ AI Worker encountered an error", { queue: worker.name, error: err });
    });
  });

  logger.info("BullMQ AI Workers successfully initialized for ai-high, ai-medium, and ai-low queues");
  
  _workers = workers;
  return workers;
}

const isMain = typeof process !== "undefined" && process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith("aiWorker.ts") ||
  process.argv[1].endsWith("aiWorker.js")
);

if (isMain) {
  startAIWorkers();
}
