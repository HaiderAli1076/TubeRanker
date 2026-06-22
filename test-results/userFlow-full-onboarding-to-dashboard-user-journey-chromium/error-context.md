# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: userFlow.spec.ts >> full onboarding to dashboard user journey
- Location: e2e\userFlow.spec.ts:3:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 5000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
  navigated to "http://localhost:3000/login?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - link "rocket_launch TubeRank" [ref=e3] [cursor=pointer]:
      - /url: /
      - generic [ref=e4]: rocket_launch
      - generic [ref=e5]: TubeRank
    - button "Search" [ref=e6] [cursor=pointer]: search
    - button "Notifications" [ref=e7] [cursor=pointer]: notifications
  - generic [ref=e10]:
    - alert:
      - generic:
        - img
      - generic:
        - heading "Sign-in Error" [level=3]
        - paragraph
      - button "Dismiss notification":
        - img
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - img [ref=e14]
          - generic [ref=e17]: TubeRank
        - paragraph [ref=e18]: AI-powered YouTube growth
      - button "Continue with Google" [ref=e20] [cursor=pointer]:
        - img [ref=e21]
        - generic [ref=e26]: Continue with Google
      - generic [ref=e27]:
        - text: By continuing, you agree to our
        - link "Terms" [ref=e28] [cursor=pointer]:
          - /url: /terms
        - text: and
        - link "Privacy" [ref=e29] [cursor=pointer]:
          - /url: /privacy
    - generic [ref=e31]:
      - heading "Verification - State Controller" [level=4] [ref=e32]
      - generic [ref=e33]:
        - button "Default" [ref=e34] [cursor=pointer]
        - button "Hover" [ref=e35] [cursor=pointer]
        - button "Loading" [ref=e36] [cursor=pointer]
        - button "Error" [ref=e37] [cursor=pointer]
        - button "Success" [ref=e38] [cursor=pointer]
      - generic [ref=e39]: "Active state: default"
  - alert [ref=e40]
```

# Test source

```ts
  62  |           volume: 150000,
  63  |           suggestions: [{ keyword: "nextjs saas", volume: 20000 }],
  64  |         },
  65  |       }),
  66  |     });
  67  |   });
  68  | 
  69  |   await page.route("**/api/ai/title-generator", async (route) => {
  70  |     await route.fulfill({
  71  |       status: 200,
  72  |       contentType: "application/json",
  73  |       body: JSON.stringify({
  74  |         success: true,
  75  |         data: { state: "waiting", jobId: "ai-flow-job-111" },
  76  |       }),
  77  |     });
  78  |   });
  79  | 
  80  |   await page.route("**/api/jobs/ai-flow-job-111", async (route) => {
  81  |     jobPollCount++;
  82  |     const state = jobPollCount >= 2 ? "completed" : "waiting";
  83  |     const result = state === "completed" ? { titles: [{ title: "Ultimate Next.js Guide", rationale: "highly searchable" }] } : null;
  84  |     await route.fulfill({
  85  |       status: 200,
  86  |       contentType: "application/json",
  87  |       body: JSON.stringify({
  88  |         success: true,
  89  |         data: { state, result },
  90  |       }),
  91  |     });
  92  |   });
  93  | 
  94  |   // Listen for console logs and uncaught errors
  95  |   page.on("console", (msg) => console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text()));
  96  |   page.on("pageerror", (err) => console.error("BROWSER PAGEERROR:", err.message));
  97  | 
  98  |   // 2. Begin Test Flow: Navigate to login
  99  |   await page.goto("/login");
  100 |   await page.waitForLoadState("networkidle");
  101 | 
  102 |   // Check login elements
  103 |   await expect(page.locator("text=TubeRank").first()).toBeVisible();
  104 |   
  105 |   // Click Google OAuth mock button
  106 |   const googleBtn = page.locator('button:has-text("Continue with Google")');
  107 |   await googleBtn.click();
  108 | 
  109 |   // Wait for redirect to onboarding (Google button redirect has 1.5s simulated timeout)
  110 |   await page.waitForURL("**/onboarding", { timeout: 10000 });
  111 | 
  112 |   // 3. Onboarding Wizard Step 1: Channel Connection
  113 |   await expect(page.locator("text=Let's grow your channel")).toBeVisible();
  114 | 
  115 |   // Click channel dropdown button to open options
  116 |   const dropdownBtn = page.locator("#channel-select-button");
  117 |   await dropdownBtn.click();
  118 | 
  119 |   // Select "TechByte" option
  120 |   const option = page.locator("text=TechByte");
  121 |   await option.click();
  122 | 
  123 |   // Click Connect Channel
  124 |   const connectBtn = page.locator('button:has-text("Connect Channel")');
  125 |   await connectBtn.click();
  126 | 
  127 |   // Wait for step transition (200ms step exit/enter transition)
  128 |   await page.waitForTimeout(300);
  129 | 
  130 |   // 4. Onboarding Step 2: Competitor Tracking
  131 |   await expect(page.locator("text=Who are you competing with?")).toBeVisible();
  132 | 
  133 |   // Search competitor "tech"
  134 |   const searchInput = page.locator('input[placeholder*="Search competitor channel name"]');
  135 |   await searchInput.fill("tech");
  136 | 
  137 |   // Wait for 300ms search input debounce
  138 |   await page.waitForTimeout(400);
  139 | 
  140 |   // Select "Linus Tech Tips"
  141 |   const competitorCard = page.locator('button:has-text("Linus Tech Tips")');
  142 |   await competitorCard.click();
  143 | 
  144 |   // Click "Add Competitor (1)" or "Add Competitor" button
  145 |   const addCompBtn = page.locator('button:has-text("Add Competitor")');
  146 |   await addCompBtn.click();
  147 | 
  148 |   // Wait for step transition
  149 |   await page.waitForTimeout(300);
  150 | 
  151 |   // 5. Onboarding Step 3: Success Screen
  152 |   await expect(page.locator("text=You're all set!")).toBeVisible();
  153 | 
  154 |   // Click "Go to Dashboard" to trigger confetti and redirect
  155 |   const finishBtn = page.locator('button:has-text("Go to Dashboard")');
  156 |   await finishBtn.click();
  157 | 
  158 |   // Verify confetti canvas rendered
  159 |   await expect(page.locator('[data-testid="confetti-canvas"]')).toBeVisible();
  160 | 
  161 |   // Wait for confetti redirect (2s simulated timeout)
> 162 |   await page.waitForURL("**/dashboard", { timeout: 5000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 5000ms exceeded.
  163 | 
  164 |   // 6. Dashboard: Keyword Research
  165 |   await expect(page.locator("text=YouTube Analytics")).toBeVisible();
  166 | 
  167 |   const kwInput = page.locator('input[placeholder="Search keyword suggestion..."]');
  168 |   await kwInput.fill("saas");
  169 | 
  170 |   const kwSearchBtn = page.locator('button:has-text("Search")');
  171 |   await kwSearchBtn.click();
  172 | 
  173 |   // Verify search result renders in table
  174 |   await expect(page.locator("text=150,000")).toBeVisible();
  175 |   await expect(page.locator("text=nextjs saas")).toBeVisible();
  176 | 
  177 |   // 7. Dashboard: AI Creators Suite
  178 |   const aiTabBtn = page.locator('button:has-text("AI Creators Suite")');
  179 |   await aiTabBtn.click();
  180 | 
  181 |   await expect(page.locator("text=AI Title Generator Settings")).toBeVisible();
  182 | 
  183 |   const aiTopicInput = page.locator('input[placeholder="e.g. Building a SaaS in 24 hours"]');
  184 |   await aiTopicInput.fill("Learn Next.js");
  185 | 
  186 |   const aiSubmitBtn = page.locator('button:has-text("Generate with AI")');
  187 |   await aiSubmitBtn.click();
  188 | 
  189 |   // Wait for polling to retrieve title result
  190 |   await expect(page.locator("text=Ultimate Next.js Guide")).toBeVisible({ timeout: 6000 });
  191 | });
  192 | 
```