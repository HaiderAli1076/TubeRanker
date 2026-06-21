/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateAIContent } from "./groq";
import { sanitizeInput } from "../sanitize";
import { logger } from "../logger";
import { deductCredits, addCredits } from "../credits";
import {
  titleGeneratorPrompts,
  descriptionWriterPrompts,
  thumbnailConceptsPrompts,
  contentOutlinePrompts,
  seoAuditPrompts,
  scorecardPrompts,
  competitorGapPrompts,
} from "./prompts/v1/prompts";
import {
  titleGeneratorSchema,
  descriptionWriterSchema,
  thumbnailConceptsSchema,
  contentOutlineSchema,
  seoAuditSchema,
  scorecardSchema,
  competitorGapSchema,
  parseAIOutput,
} from "./schemas";
import { setCachedAIResult } from "./cache";
import { getVideoDetails } from "../youtube";
import { calculateOverallScore } from "./scorecard";

export async function processAIJobInline(
  userId: string,
  tool: string,
  inputs: Record<string, any>,
  creditsCost: number,
  cacheKey: string
): Promise<any> {
  logger.info("Processing AI job inline", { tool, userId });

  // 1. Deduct credits first; will throw QuotaError if insufficient
  await deductCredits(userId, tool, creditsCost);

  try {
    // 2. Resolve prompts and schema
    let systemPrompt = "";
    let userPrompt = "";
    let schema: any;

    switch (tool) {
      case "title-generator":
        systemPrompt = titleGeneratorPrompts.system;
        userPrompt = titleGeneratorPrompts.user(
          sanitizeInput(inputs.topic || "", "topic"),
          inputs.keywords ? sanitizeInput(inputs.keywords, "keywords") : undefined
        );
        schema = titleGeneratorSchema;
        break;

      case "description-writer":
        systemPrompt = descriptionWriterPrompts.system;
        userPrompt = descriptionWriterPrompts.user(
          sanitizeInput(inputs.title || "", "title"),
          sanitizeInput(inputs.topic || "", "topic")
        );
        schema = descriptionWriterSchema;
        break;

      case "thumbnail-concepts":
        systemPrompt = thumbnailConceptsPrompts.system;
        userPrompt = thumbnailConceptsPrompts.user(
          sanitizeInput(inputs.title || "", "title"),
          sanitizeInput(inputs.description || "", "description")
        );
        schema = thumbnailConceptsSchema;
        break;

      case "content-outline":
        systemPrompt = contentOutlinePrompts.system;
        userPrompt = contentOutlinePrompts.user(
          sanitizeInput(inputs.topic || "", "topic"),
          inputs.targetDuration ? sanitizeInput(inputs.targetDuration, "targetDuration") : undefined
        );
        schema = contentOutlineSchema;
        break;

      case "seo-audit":
        systemPrompt = seoAuditPrompts.system;
        userPrompt = seoAuditPrompts.user(
          sanitizeInput(inputs.title || "", "title"),
          sanitizeInput(inputs.description || "", "description"),
          inputs.tags ? sanitizeInput(inputs.tags, "tags") : undefined
        );
        schema = seoAuditSchema;
        break;

      case "video-scorecard": {
        const videoId = sanitizeInput(inputs.videoId || "", "videoId");
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
          sanitizeInput(inputs.userChannel || "", "userChannel"),
          sanitizeInput(inputs.competitorChannels || "", "competitorChannels")
        );
        schema = competitorGapSchema;
        break;

      default:
        throw new Error(`Unsupported AI tool: ${tool}`);
    }

    // 3. Call AI Content Generation
    logger.info("Requesting content generation from Groq API inline");
    const rawResponse = await generateAIContent(userPrompt, systemPrompt);

    // 4. Parse & Validate
    const parsedResponse = parseAIOutput(rawResponse, schema);
    let finalResult: any = parsedResponse;

    if (tool === "video-scorecard") {
      const videoId = sanitizeInput(inputs.videoId || "", "videoId");
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

    // 5. Cache result
    await setCachedAIResult(cacheKey, finalResult);

    return finalResult;
  } catch (error) {
    // Attempt refunding credits on failure
    try {
      await addCredits(userId, creditsCost, `Refund: AI generation failure for ${tool}`);
      logger.info("Successfully refunded user credits upon inline task failure", { userId, tool, amount: creditsCost });
    } catch (refundError) {
      logger.error("CRITICAL CREDIT REFUND FAILURE: Failed to refund user credits upon inline task failure", {
        userId,
        tool,
        amount: creditsCost,
        error: refundError,
      });
    }
    throw error;
  }
}
