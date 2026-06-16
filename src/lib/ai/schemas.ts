import { z } from "zod";

// 1. Title Generator Output Schema
export const titleGeneratorSchema = z.object({
  titles: z.array(
    z.object({
      title: z.string().min(1),
      rationale: z.string().min(1),
    })
  ),
});

// 2. Description Writer Output Schema
export const descriptionWriterSchema = z.object({
  introduction: z.string().min(1),
  chapters: z.array(
    z.object({
      timestamp: z.string().min(1),
      title: z.string().min(1),
    })
  ),
  callToAction: z.string().min(1),
  tags: z.array(z.string()),
});

// 3. Thumbnail Concepts Output Schema
export const thumbnailConceptsSchema = z.object({
  concepts: z.array(
    z.object({
      description: z.string().min(1),
      textOverlay: z.string().min(1),
      colorPalette: z.array(z.string()),
      visualElements: z.array(z.string()),
    })
  ),
});

// 4. Content Outline Output Schema
export const contentOutlineSchema = z.object({
  sections: z.array(
    z.object({
      name: z.string().min(1),
      durationEstimated: z.string().min(1),
      talkingPoints: z.array(z.string()),
    })
  ),
  keyTakeaways: z.array(z.string()),
});

// 5. SEO Audit Output Schema
export const seoAuditSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  suggestedKeywords: z.array(z.string()),
});

// 6. Video Scorecard AI Output Schema
export const scorecardSchema = z.object({
  titleScore: z.number().min(0).max(100),
  descriptionScore: z.number().min(0).max(100),
  tagsScore: z.number().min(0).max(100),
  thumbnailScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// 7. Competitor Gap Analysis AI Output Schema
export const competitorGapSchema = z.object({
  metricComparisons: z.object({
    subscribersGap: z.string(),
    viewsGap: z.string(),
    videoCountGap: z.string(),
  }),
  contentGaps: z.array(
    z.object({
      topic: z.string(),
      competitorPerformance: z.string(),
      recommendation: z.string(),
    })
  ),
  seoGaps: z.array(z.string()),
  actionPlan: z.array(z.string()),
});

/**
 * Shared output parser used by all tool routes.
 * Strips markdown json codeblocks if present, parses JSON, and validates with Zod.
 */
export function parseAIOutput<T>(text: string, schema: z.ZodSchema<T>): T {
  const cleaned = text.replace(/^```json\n?|\n?```$/g, "").trim();
  const parsedJson = JSON.parse(cleaned);
  return schema.parse(parsedJson);
}
