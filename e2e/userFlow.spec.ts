import { test, expect } from "@playwright/test";

test("full onboarding to dashboard user journey", async ({ page }) => {
  // 1. Setup API network interception mocks
  let jobPollCount = 0;

  await page.route("**/api/user/credits", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { credits: 10 } }),
    });
  });

  await page.route("**/api/competitors", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: "comp-999", name: "Custom Tech Comp", youtubeId: "UCCustom" },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  });

  await page.route("**/api/channels/**/analytics", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          channel: {
            id: "ch-123",
            youtubeId: "UC123",
            title: "My Channel",
            description: "Growing channel",
            thumbnailUrl: "https://example.com/avatar.jpg",
          },
          stats: { viewCount: "1000", subscriberCount: "500", videoCount: "10" },
          history: [],
        },
      }),
    });
  });

  await page.route("**/api/keywords/search", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          volume: 150000,
          suggestions: [{ keyword: "nextjs saas", volume: 20000 }],
        },
      }),
    });
  });

  await page.route("**/api/ai/title-generator", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { state: "waiting", jobId: "ai-flow-job-111" },
      }),
    });
  });

  await page.route("**/api/jobs/ai-flow-job-111", async (route) => {
    jobPollCount++;
    const state = jobPollCount >= 2 ? "completed" : "waiting";
    const result = state === "completed" ? { titles: [{ title: "Ultimate Next.js Guide", rationale: "highly searchable" }] } : null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { state, result },
      }),
    });
  });

  // Listen for console logs and uncaught errors
  page.on("console", (msg) => console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text()));
  page.on("pageerror", (err) => console.error("BROWSER PAGEERROR:", err.message));

  // 2. Begin Test Flow: Navigate to login
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Check login elements
  await expect(page.locator("text=TubeRank").first()).toBeVisible();
  
  // Click Google OAuth mock button
  const googleBtn = page.locator('button:has-text("Continue with Google")');
  await googleBtn.click();

  // Wait for redirect to onboarding (Google button redirect has 1.5s simulated timeout)
  await page.waitForURL("**/onboarding", { timeout: 10000 });

  // 3. Onboarding Wizard Step 1: Channel Connection
  await expect(page.locator("text=Let's grow your channel")).toBeVisible();

  // Click channel dropdown button to open options
  const dropdownBtn = page.locator("#channel-select-button");
  await dropdownBtn.click();

  // Select "TechByte" option
  const option = page.locator("text=TechByte");
  await option.click();

  // Click Connect Channel
  const connectBtn = page.locator('button:has-text("Connect Channel")');
  await connectBtn.click();

  // Wait for step transition (200ms step exit/enter transition)
  await page.waitForTimeout(300);

  // 4. Onboarding Step 2: Competitor Tracking
  await expect(page.locator("text=Who are you competing with?")).toBeVisible();

  // Search competitor "tech"
  const searchInput = page.locator('input[placeholder*="Search competitor channel name"]');
  await searchInput.fill("tech");

  // Wait for 300ms search input debounce
  await page.waitForTimeout(400);

  // Select "Linus Tech Tips"
  const competitorCard = page.locator('button:has-text("Linus Tech Tips")');
  await competitorCard.click();

  // Click "Add Competitor (1)" or "Add Competitor" button
  const addCompBtn = page.locator('button:has-text("Add Competitor")');
  await addCompBtn.click();

  // Wait for step transition
  await page.waitForTimeout(300);

  // 5. Onboarding Step 3: Success Screen
  await expect(page.locator("text=You're all set!")).toBeVisible();

  // Click "Go to Dashboard" to trigger confetti and redirect
  const finishBtn = page.locator('button:has-text("Go to Dashboard")');
  await finishBtn.click();

  // Verify confetti canvas rendered
  await expect(page.locator('[data-testid="confetti-canvas"]')).toBeVisible();

  // Wait for confetti redirect (2s simulated timeout)
  await page.waitForURL("**/dashboard", { timeout: 5000 });

  // 6. Dashboard: Keyword Research
  await expect(page.locator("text=YouTube Analytics")).toBeVisible();

  const kwInput = page.locator('input[placeholder="Search keyword suggestion..."]');
  await kwInput.fill("saas");

  const kwSearchBtn = page.locator('button:has-text("Search")');
  await kwSearchBtn.click();

  // Verify search result renders in table
  await expect(page.locator("text=150,000")).toBeVisible();
  await expect(page.locator("text=nextjs saas")).toBeVisible();

  // 7. Dashboard: AI Creators Suite
  const aiTabBtn = page.locator('button:has-text("AI Creators Suite")');
  await aiTabBtn.click();

  await expect(page.locator("text=AI Title Generator Settings")).toBeVisible();

  const aiTopicInput = page.locator('input[placeholder="e.g. Building a SaaS in 24 hours"]');
  await aiTopicInput.fill("Learn Next.js");

  const aiSubmitBtn = page.locator('button:has-text("Generate with AI")');
  await aiSubmitBtn.click();

  // Wait for polling to retrieve title result
  await expect(page.locator("text=Ultimate Next.js Guide")).toBeVisible({ timeout: 6000 });
});
