export function buildScorecardPrompt(channelData: {
  channelId: string;
  channelName: string;
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
  publishedAt: string;
  uploadFrequencyDays: number; // avg days between uploads
  last20Videos: Array<{
    title: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    publishedAt: string;
  }>;
}): string {
  const formattedVideos = channelData.last20Videos
    .map(
      (v, i) =>
        `${i + 1}. Title: "${v.title}" | Views: ${v.viewCount} | Likes: ${v.likeCount} | Comments: ${v.commentCount} | Published: ${v.publishedAt}`
    )
    .join("\n");

  return `You are an expert YouTube Channel Audit assistant.
You will conduct a critical assessment of the following YouTube channel's metadata and statistics to generate a comprehensive scored scorecard report.

CHANNEL DATA:
- Channel ID: ${channelData.channelId}
- Channel Name: ${channelData.channelName}
- Subscribers: ${channelData.subscriberCount}
- Total Views: ${channelData.totalViews}
- Total Videos: ${channelData.videoCount}
- Created At: ${channelData.publishedAt}
- Upload Frequency: Average of ${channelData.uploadFrequencyDays.toFixed(1)} days between uploads.

LAST 20 VIDEOS METRICS:
${formattedVideos}

SCORING INSTRUCTIONS & CRITERIA:
Evaluate the channel across 6 key dimensions on a 0-100 scale:

1. contentConsistency (20% weight):
   - Evaluate the upload frequency and gap consistency. Gaps under 7 days are Excellent; long or erratic gaps decrease this score.
2. engagementRate (25% weight):
   - Calculate (likes + comments) / views across the last 20 videos. Compare this to typical benchmarks (e.g. 2-5% is average, 5-10% is strong, 10%+ is excellent) while scaling for channel size.
3. titleSeoQuality (15% weight):
   - Evaluate the titles of the last 20 videos for click-through rate (CTR) optimization, keyword inclusion, length, and hook quality.
4. thumbnailStrategy (10% weight):
   - Analyze title relevance and visual contrast cues from text analysis of the video title metadata. Score their likely visual impact.
5. audienceGrowthVelocity (15% weight):
   - Calculate the subscriber velocity proxy: total subscribers divided by total months since the channel creation date (${channelData.publishedAt}).
6. nicheAuthority (15% weight):
   - Evaluate semantic topic cohesion and keyword focus across the last 20 video titles to see if the channel is dedicated to a specific niche or lacks focus.

OUTPUT SCHEMA REQUIREMENTS:
You MUST respond with a JSON object conforming exactly to this structure:
{
  "channelId": "${channelData.channelId}",
  "channelName": "${channelData.channelName}",
  "overallScore": 85, // Weighted average of the 6 dimensions (contentConsistency: 20%, engagementRate: 25%, titleSeoQuality: 15%, thumbnailStrategy: 10%, audienceGrowthVelocity: 15%, nicheAuthority: 15%)
  "grade": "B", // overallScore 90+ -> "A", 75-89 -> "B", 60-74 -> "C", 40-59 -> "D", below 40 -> "F"
  "dimensions": {
    "contentConsistency": {
      "score": 85, // 0-100
      "label": "Excellent", // 80-100 -> "Excellent", 65-79 -> "Strong", 45-64 -> "Average", 25-44 -> "Needs Work", 0-24 -> "Poor"
      "insight": "AI-generated explanation of the score, 1-2 sentences (between 10 and 300 characters).",
      "recommendation": "1 actionable specific recommendation to improve this score (between 10 and 300 characters)."
    },
    "engagementRate": {
      "score": 75,
      "label": "Strong",
      "insight": "AI-generated explanation of the engagement rate.",
      "recommendation": "Actionable feedback to improve audience engagement."
    },
    "titleSeoQuality": {
      "score": 60,
      "label": "Average",
      "insight": "AI-generated audit of title keywords and CTR hooks.",
      "recommendation": "Specific title structures to implement."
    },
    "thumbnailStrategy": {
      "score": 40,
      "label": "Needs Work",
      "insight": "AI-generated analysis of metadata indicators.",
      "recommendation": "Visual improvements suggestion."
    },
    "audienceGrowthVelocity": {
      "score": 80,
      "label": "Excellent",
      "insight": "AI-generated analysis of subscriber velocity.",
      "recommendation": "Growth advice."
    },
    "nicheAuthority": {
      "score": 70,
      "label": "Strong",
      "insight": "AI-generated audit of topic cohesion.",
      "recommendation": "Cohesion recommendations."
    }
  },
  "topStrength": "contentConsistency", // key of the dimension with the highest score
  "criticalWeakness": "thumbnailStrategy", // key of the dimension with the lowest score
  "generatedAt": "placeholder"
}

IMPORTANT RULES:
1. Return ONLY a valid JSON string.
2. Do NOT wrap the JSON in markdown code blocks (e.g. \`\`\`json ... \`\`\`).
3. Do NOT output any backticks, markdown, HTML, prefaces, or trailing notes.
4. Ensure all string lengths for insight and recommendation fields are strictly between 10 and 300 characters.
5. All scores must be integers between 0 and 100.
6. Dimension label must be one of: "Excellent" | "Strong" | "Average" | "Needs Work" | "Poor".
7. Overall grade must be one of: "A" | "B" | "C" | "D" | "F".`;
}
