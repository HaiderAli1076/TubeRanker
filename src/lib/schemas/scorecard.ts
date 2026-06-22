import { z } from "zod";

export const DimensionSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.enum(["Excellent", "Strong", "Average", "Needs Work", "Poor"]),
  insight: z.string().min(10).max(300),
  recommendation: z.string().min(10).max(300),
});

export const ScorecardSchema = z.object({
  channelId: z.string(),
  channelName: z.string(),
  overallScore: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  dimensions: z.object({
    contentConsistency: DimensionSchema,
    engagementRate: DimensionSchema,
    titleSeoQuality: DimensionSchema,
    thumbnailStrategy: DimensionSchema,
    audienceGrowthVelocity: DimensionSchema,
    nicheAuthority: DimensionSchema,
  }),
  topStrength: z.string(),
  criticalWeakness: z.string(),
  generatedAt: z.string(),
});

export type Scorecard = z.infer<typeof ScorecardSchema>;
