/**
 * Scoring weights for calculating the overall YouTube video optimization score (0-100).
 * Sum of weights must equal 1.00.
 */
export const SCORE_WEIGHTS = {
  // Title (30%): The primary text hook for search discovery and viewer click-through rate (CTR).
  title: 0.30,

  // Description (25%): Provides crucial contextual relevance for the YouTube search crawler, links, and chapter metadata.
  description: 0.25,

  // Tags (25%): Helps categorization and targets auxiliary search phrases to align with viewer intent.
  tags: 0.25,

  // Thumbnail (20%): Evaluates clickability and contrast; vital for visual CTR but secondary to textual search indicators.
  thumbnail: 0.20,
} as const;

/**
 * Calculates the overall optimization score based on weighted subscores.
 */
export function calculateOverallScore(subscores: {
  title: number;
  description: number;
  tags: number;
  thumbnail: number;
}): number {
  return Math.round(
    subscores.title * SCORE_WEIGHTS.title +
    subscores.description * SCORE_WEIGHTS.description +
    subscores.tags * SCORE_WEIGHTS.tags +
    subscores.thumbnail * SCORE_WEIGHTS.thumbnail
  );
}
