/**
 * Mock Gemini Provider for TubeRank
 * Returns realistic schema-compliant JSON strings matching Zod schemas.
 */
export function getMockAIContent(prompt: string, systemInstruction?: string): string {
  const sys = (systemInstruction || "").toLowerCase();
  const p = prompt.toLowerCase();

  // 0. Channel Scorecard
  if (p.includes("channel") || sys.includes("channel")) {
    return `\`\`\`json
{
  "channelId": "UCBJycsmduvYEL83R_U4JriQ",
  "channelName": "Marques Brownlee",
  "overallScore": 88,
  "grade": "B",
  "dimensions": {
    "contentConsistency": {
      "score": 90,
      "label": "Excellent",
      "insight": "Consistent upload schedule with videos published regularly every 3-4 days.",
      "recommendation": "Maintain the current upload cadence."
    },
    "engagementRate": {
      "score": 85,
      "label": "Excellent",
      "insight": "High engagement rate across all videos, with active comment sections and high likes-to-views ratio.",
      "recommendation": "Encourage more discussion in pinned comments."
    },
    "titleSeoQuality": {
      "score": 82,
      "label": "Excellent",
      "insight": "Titles are highly engaging, optimized with relevant search terms, and drive strong interest.",
      "recommendation": "Continue testing variations of short vs long titles."
    },
    "thumbnailStrategy": {
      "score": 88,
      "label": "Excellent",
      "insight": "Thumbnails are clean, high-contrast, and show prominent facial elements or clear focal points.",
      "recommendation": "Maintain the clean minimalist branding."
    },
    "audienceGrowthVelocity": {
      "score": 92,
      "label": "Excellent",
      "insight": "Strong subscriber growth relative to channel age and steady view counts.",
      "recommendation": "Leverage community tabs to engage subscribers."
    },
    "nicheAuthority": {
      "score": 95,
      "label": "Excellent",
      "insight": "High topic consistency across tech reviews and hardware discussions.",
      "recommendation": "Produce series around recurring themes."
    }
  },
  "topStrength": "nicheAuthority",
  "criticalWeakness": "titleSeoQuality",
  "generatedAt": "placeholder"
}
\`\`\``;
  }

  // 1. Video Scorecard
  if (sys.includes("scorecard") || p.includes("scorecard")) {
    // Return specific values for Rick Astley - Never Gonna Give You Up (dQw4w9WgXcQ)
    if (p.includes("dqw4w9wgxcq") || p.includes("never gonna give you up")) {
      return `\`\`\`json
{
  "titleScore": 85,
  "descriptionScore": 90,
  "tagsScore": 80,
  "thumbnailScore": 70,
  "strengths": [
    "Title includes clear artist and official video indicators",
    "Description contains comprehensive social and purchase links",
    "High density of descriptive tags relevant to the genre"
  ],
  "weaknesses": [
    "Description lacks timestamp chapters",
    "Thumbnail is low resolution (from 2009) and lacks modern high-contrast overlays"
  ],
  "recommendations": [
    "Add video chapter marks for better user retention",
    "Update thumbnail with modern high-contrast design and bold overlay text"
  ]
}
\`\`\``;
    }

    // Default scorecard mock
    return `\`\`\`json
{
  "titleScore": 75,
  "descriptionScore": 65,
  "tagsScore": 60,
  "thumbnailScore": 50,
  "strengths": [
    "Topic is clearly defined in the video title",
    "Basic description is present"
  ],
  "weaknesses": [
    "Description is too short and lacks call to action links",
    "Tags are minimal and miss high-volume searches",
    "Thumbnail does not stand out visually"
  ],
  "recommendations": [
    "Expand title to include secondary keywords",
    "Add social links and call to action to description",
    "Incorporate 10 more relevant search tags",
    "Redesign the thumbnail with high-contrast text"
  ]
}
\`\`\``;
  }

  // 2. Competitor Gap Analysis
  if (sys.includes("competitor") || p.includes("competitor") || sys.includes("gap") || p.includes("gap")) {
    return `\`\`\`json
{
  "metricComparisons": {
    "subscribersGap": "Competitor channels have a subscriber range from 50K to 250K, whereas your channel is currently at 12.5K. The gap is approximately 4x to 20x.",
    "viewsGap": "Competitors average 15K views per video within the first 7 days, compared to your average of 1.2K views.",
    "videoCountGap": "Your competitors upload 2.5 times more frequently (twice a week vs your bi-weekly schedule)."
  },
  "contentGaps": [
    {
      "topic": "Next.js 14 App Router Best Practices",
      "competitorPerformance": "High performance (average 45K views, positive comment sentiment)",
      "recommendation": "Produce a deep-dive video covering Next.js 14 layout patterns, as it is a highly searched and under-served query in your specific niche."
    },
    {
      "topic": "Prisma 7 Database Migrations Guide",
      "competitorPerformance": "Steady views with long-tail search traffic",
      "recommendation": "Create a tutorial showing how to use Prisma 7 migrations in Docker environments."
    }
  ],
  "seoGaps": [
    "Competitors consistently rank high for keywords 'nextjs database tutorial' and 'prisma postgres docker' which are missing from your video tags.",
    "Competitors use interactive chapter marks to boost viewer retention scores."
  ],
  "actionPlan": [
    "Produce a 15-minute hands-on tutorial on Next.js 14 + Prisma 7 within the next 10 days.",
    "Incorporate tags: 'nextjs tutorial', 'prisma 7 database', 'indie hacker mvp' in your upcoming uploads.",
    "Add explicit, keyword-rich timestamp chapters in your next 3 video descriptions."
  ]
}
\`\`\``;
  }

  // 3. Title Generator
  if (sys.includes("expert") || sys.includes("ctr") || sys.includes("title") || p.includes("title")) {
    return `\`\`\`json
{
  "titles": [
    {
      "title": "I Built a SaaS in 24 Hours (And Made My First Sale)",
      "rationale": "High curiosity loop and clear benefit-driven time constraint."
    },
    {
      "title": "How to Build a SaaS in 2026 (Step-by-Step Guide)",
      "rationale": "Strong search intent mapping with evergreen 'how-to' structure."
    },
    {
      "title": "Why 99% of Developers Fail at SaaS (Avoid These Mistakes)",
      "rationale": "Uses negative bias and high stakes to prompt immediate clicks."
    }
  ]
}
\`\`\``;
  }

  // 4. Description Writer
  if (sys.includes("description") || sys.includes("descriptions") || p.includes("description")) {
    return `\`\`\`json
{
  "introduction": "In this video, we build a SaaS startup from scratch in just 24 hours. Learn the exact stack, shortcuts, and launch strategies we used to go from idea to paying user.",
  "chapters": [
    { "timestamp": "00:00", "title": "The 24h SaaS Challenge" },
    { "timestamp": "02:15", "title": "Selecting the Stack (Next.js & Prisma)" },
    { "timestamp": "06:45", "title": "Building the Core MVP" },
    { "timestamp": "12:30", "title": "Stripe Integration & Paywall" },
    { "timestamp": "18:20", "title": "Launching & First Customer" }
  ],
  "callToAction": "Subscribe for more build-in-public challenges and get our starter template: https://tubernker.com/template",
  "tags": ["saas", "indiehackers", "buildinpublic", "nextjs", "prisma"]
}
\`\`\``;
  }

  // 5. Thumbnail Concepts
  if (sys.includes("thumbnail") || sys.includes("thumbnails") || p.includes("thumbnail")) {
    return `\`\`\`json
{
  "concepts": [
    {
      "description": "A split screen layout. Left side: dark IDE editor showing a red bug icon. Right side: green browser dashboard showing '$1,240' revenue.",
      "textOverlay": "SaaS in 24H",
      "colorPalette": ["Deep Black", "Neon Green", "Vibrant Red"],
      "visualElements": ["Code editor screenshot", "Stripe revenue graph", "Vibrant arrow"]
    },
    {
      "description": "Close-up portrait of the creator expressing disbelief, looking at a laptop displaying a 'Launch Successful' banner.",
      "textOverlay": "IT WORKS?!",
      "colorPalette": ["Dark Slate", "Electric Purple", "White"],
      "visualElements": ["Creator face", "Laptop glow", "Sparkles"]
    }
  ]
}
\`\`\``;
  }

  // 6. Content Outline
  if (sys.includes("outline") || sys.includes("outlines") || p.includes("outline")) {
    return `\`\`\`json
{
  "sections": [
    {
      "name": "The Hook & Challenge Setup",
      "durationEstimated": "0:00 - 1:30",
      "talkingPoints": [
        "Explain the challenge: Build and launch a SaaS in 24 hours.",
        "Show proof of the end result immediately to retain viewers.",
        "Introduce the stack: Next.js, Prisma, Redis, Tailwind."
      ]
    },
    {
      "name": "Phase 1: Database Setup & Prisma Model Design",
      "durationEstimated": "1:30 - 5:00",
      "talkingPoints": [
        "Create the initial schema with User, Billing, and Job models.",
        "Demonstrate the Prisma migration setup."
      ]
    }
  ],
  "keyTakeaways": [
    "Always start with a clear, minimal scope.",
    "Use boilerplate code for authentication and payments.",
    "Validate your idea before writing any code."
  ]
}
\`\`\``;
  }

  // 7. Fallback (SEO Audit / Default)
  return `\`\`\`json
{
  "score": 82,
  "strengths": [
    "Good description length with social media links",
    "Proper video tags targeting direct keywords"
  ],
  "weaknesses": [
    "No call to action to subscribe",
    "Lacks timestamp chapters"
  ],
  "recommendations": [
    "Add a call to action at the top of the description",
    "Insert timestamps to improve user retention"
  ],
  "suggestedKeywords": ["youtube seo", "growth tips", "video audit"]
}
\`\`\``;
}
