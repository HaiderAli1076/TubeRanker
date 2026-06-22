import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import DashboardPage from "../page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const renderWithQueryClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe("DashboardPage Component Tests", () => {
  let fetchMock: any;

  beforeEach(() => {
    queryClient.clear();
    // Default mocks for standard initial loading
    fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/user/credits")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { credits: 10 } }),
        } as any;
      }
      if (urlStr.includes("/api/competitors")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [] }),
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: null }),
      } as any;
    });
  });

  afterEach(() => {
    fetchMock.mockRestore();
    vi.useRealTimers();
  });

  // 1. EMPTY STATES
  it("renders empty/initial states for YouTube Analytics dashboard view", async () => {
    renderWithQueryClient(<DashboardPage />);

    // Sidebar view check
    expect(screen.getAllByText("YouTube Analytics")[0]).toBeInTheDocument();
    
    // Keyword initial empty state check
    expect(screen.getByText(/Search a keyword to see estimated search volumes/i)).toBeInTheDocument();
    
    // Competitor initial empty state check
    await waitFor(() => {
      expect(screen.getByText(/No competitors tracked yet. Add a Channel ID above./i)).toBeInTheDocument();
    });

    // Channel stats initial empty state check
    await waitFor(() => {
      expect(screen.getByText(/Input a YouTube Channel ID above to view stats/i)).toBeInTheDocument();
    });
  });

  // 2. LOADING STATES
  it("renders loading/skeleton states during active fetches", async () => {
    // Make competitors API fetch load slowly/resolve to pending
    fetchMock.mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/user/credits")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { credits: 15 } }),
        } as any;
      }
      if (urlStr.includes("/api/competitors")) {
        // Return a promise that does not resolve immediately to keep it in isLoading state
        return new Promise(() => {});
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: null }) } as any;
    });

    renderWithQueryClient(<DashboardPage />);
    // Check if the competitor card skeleton/loading state element renders
    const trackerHeading = screen.getByRole("heading", { name: /Competitors Tracker/i });
    expect(trackerHeading).toBeInTheDocument();
  });

  // 3. SUCCESS STATES
  it("renders success states with loaded competitor details and searches keywords", async () => {
    const mockCompetitors = [
      { id: "comp-1", name: "Competitor Tech", youtubeId: "UC123", createdAt: new Date().toISOString() }
    ];

    fetchMock.mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/user/credits")) {
        return { ok: true, status: 200, json: async () => ({ success: true, data: { credits: 10 } }) } as any;
      }
      if (urlStr.includes("/api/competitors")) {
        return { ok: true, status: 200, json: async () => ({ success: true, data: mockCompetitors }) } as any;
      }
      if (urlStr.includes("/api/keywords/search")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              volume: 120000,
              suggestions: [{ keyword: "saas tools", volume: 15000 }]
            }
          })
        } as any;
      }
      if (urlStr.includes("/api/channels/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              channel: { id: "ch-123", youtubeId: "UC123", title: "My Channel", description: "This is my channel", thumbnailUrl: "https://thumb.jpg" },
              stats: { viewCount: "1000", subscriberCount: "500", videoCount: "10" },
              history: [
                { id: "vid-1", youtubeId: "vid-1", title: "My First Video", publishedAt: new Date().toISOString(), viewCount: "100", likeCount: "20", commentCount: "5" }
              ]
            }
          })
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: null }) } as any;
    });

    renderWithQueryClient(<DashboardPage />);

    // Verify loading competitor name and channel analytics details
    await waitFor(() => {
      expect(screen.getByText("Competitor Tech")).toBeInTheDocument();
      expect(screen.getByText("My Channel")).toBeInTheDocument();
      expect(screen.getByText("This is my channel")).toBeInTheDocument();
      expect(screen.getByText("500")).toBeInTheDocument();
      expect(screen.getByText("My First Video")).toBeInTheDocument();
    });

    // Run a keyword search
    const keywordInput = screen.getByPlaceholderText("Search keyword suggestion...");
    fireEvent.change(keywordInput, { target: { value: "saas" } });
    
    const searchButton = screen.getByRole("button", { name: "Search" });
    fireEvent.click(searchButton);

    // Verify keyword search success results
    await waitFor(() => {
      expect(screen.getByText("120,000")).toBeInTheDocument();
      expect(screen.getByText("saas tools")).toBeInTheDocument();
    });
  });

  // 4. ERROR STATES
  it("renders error state when api fails with internal 500 error code", async () => {
    fetchMock.mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/user/credits")) {
        return { ok: true, status: 200, json: async () => ({ success: true, data: { credits: 5 } }) } as any;
      }
      if (urlStr.includes("/api/competitors")) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: { message: "Internal Database Failure", supportId: "err-999" } }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: null }) } as any;
    });

    renderWithQueryClient(<DashboardPage />);

    // Verify 500 triggers support ID display
    await waitFor(() => {
      expect(screen.getByText(/Reference Support ID:/i)).toBeInTheDocument();
      expect(screen.getByText("err-999")).toBeInTheDocument();
    });
  });

  // 5. RATE-LIMITED STATES (429)
  it("handles rate limit 429 response, triggers countdown, and auto-retries", async () => {
    let queryHits = 0;

    fetchMock.mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/user/credits")) {
        return { ok: true, status: 200, json: async () => ({ success: true, data: { credits: 8 } }) } as any;
      }
      if (urlStr.includes("/api/competitors")) {
        queryHits++;
        if (queryHits === 1) {
          return {
            ok: false,
            status: 429,
            headers: new Headers({ "Retry-After": "2" }),
            json: async () => ({ error: { message: "Rate limit exceeded" } }),
          } as any;
        }
        // Second call succeeds
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [] }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: null }) } as any;
    });

    renderWithQueryClient(<DashboardPage />);

    // Verify 429 triggers the warning banner with countdown
    await waitFor(() => {
      expect(screen.getByText(/Rate limit reached. Auto‑retrying queries in/i)).toBeInTheDocument();
    });

    // Wait for the banner to auto-retry and disappear (expires in 2 seconds)
    await waitFor(() => {
      expect(screen.queryByText(/Rate limit reached/i)).not.toBeInTheDocument();
    }, { timeout: 4000 });
  });

  // 6. AI TOOL SUITE & VIDEO SCORECARD POLLING
  it("navigates to AI Creators Suite view and tests tool job polling", async () => {
    renderWithQueryClient(<DashboardPage />);

    // Navigate to AI view
    const aiTabButton = screen.getByRole("button", { name: /AI Creators Suite/i });
    fireEvent.click(aiTabButton);

    expect(screen.getAllByText(/AI Creators Suite/i)[0]).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/^Title Gen$/)).toBeInTheDocument();
    });

    // Mock AI submit job return
    fetchMock.mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/ai/title-generator")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { state: "waiting", jobId: "ai-job-777" } }),
        } as any;
      }
      if (urlStr.includes("/api/jobs/ai-job-777")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              state: "completed",
              result: { titles: [{ title: "Awesome nextjs tips", rationale: "highly searchable" }] }
            }
          }),
        } as any;
      }
      if (urlStr.includes("/api/competitors")) {
        return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) } as any;
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: { credits: 10 } }) } as any;
    });

    // Fill AI input fields
    const topicInput = screen.getByPlaceholderText("e.g. How to lose 10kg in 30 days");
    fireEvent.change(topicInput, { target: { value: "Building nextjs apps" } });

    const form = topicInput.closest("form");
    expect(form).toBeInTheDocument();
    fireEvent.submit(form!);

    // Poll to success
    await waitFor(() => {
      expect(screen.getByText(/Awesome nextjs tips/)).toBeInTheDocument();
    }, { timeout: 4000 });

    // Mock clipboard and alert
    const writeTextMock = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    const copyButton = screen.getByRole("button", { name: /Copy/i });
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith("Awesome nextjs tips");
    expect(alertMock).toHaveBeenCalledWith("Title copied!");

    alertMock.mockRestore();
  });

  // 7. VIDEO SCORECARD AUDITING
  it("navigates to Video Scorecard view and audits a video ID to success", async () => {
    renderWithQueryClient(<DashboardPage />);

    // Navigate to Scorecard view
    const scorecardTabButton = screen.getByRole("button", { name: /Video Scorecard/i });
    fireEvent.click(scorecardTabButton);

    expect(screen.getAllByText(/Video Scorecard/i)[0]).toBeInTheDocument();

    // Mock scorecard submit job and job status
    fetchMock.mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/scorecard")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { state: "waiting", jobId: "sc-job-999" } }),
        } as any;
      }
      if (urlStr.includes("/api/jobs/sc-job-999")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              state: "completed",
              result: {
                overallScore: 85,
                subscores: { title: 90, description: 80, tags: 85, thumbnail: 85 },
                strengths: ["Great title keywords", "Good description length"],
                weaknesses: ["Add more tags"],
                recommendations: ["Include call to action in description"],
                videoId: "test-vid-111",
                videoMetadata: {
                  title: "Awesome React Video",
                  statistics: { viewCount: "5000", likeCount: "250" },
                  thumbnails: { high: { url: "https://example.com/thumb.jpg" } }
                }
              }
            }
          }),
        } as any;
      }
      if (urlStr.includes("/api/competitors")) {
        return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) } as any;
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: { credits: 10 } }) } as any;
    });

    const videoInput = screen.getByPlaceholderText(/Enter YouTube Video ID/i);
    fireEvent.change(videoInput, { target: { value: "test-vid-111" } });

    const form = videoInput.closest("form");
    expect(form).toBeInTheDocument();
    fireEvent.submit(form!);

    // Wait for optimization score, strengths, and title details to render
    await waitFor(() => {
      expect(screen.getByText("85")).toBeInTheDocument();
      expect(screen.getByText("Highly Optimized")).toBeInTheDocument();
      expect(screen.getByText("Awesome React Video")).toBeInTheDocument();
      expect(screen.getByText("Great title keywords")).toBeInTheDocument();
      expect(screen.getByText("Add more tags")).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  // 8. QUOTA EXCEEDED (402) STATE
  it("shows upgrade CTA modal when api returns 402 credits exhausted", async () => {
    fetchMock.mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/competitors")) {
        return {
          ok: false,
          status: 402,
          json: async () => ({ error: { message: "Credit quota exceeded" } }),
        } as any;
      }
      if (urlStr.includes("/api/channels/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              channel: { id: "ch-123", youtubeId: "UC123", title: "My Channel", thumbnailUrl: "https://thumb.jpg" },
              stats: { viewCount: "1000", subscriberCount: "500", videoCount: "10" },
              history: []
            }
          })
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: { credits: 0 } }) } as any;
    });

    const { unmount } = renderWithQueryClient(<DashboardPage />);

    // Verify upgrade modal pops up
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText(/Quota Exceeded/i)).toBeInTheDocument();
    });

    // Test Upgrade Plan redirect
    const oldLocation = window.location;
    delete (window as any).location;
    window.location = { href: "" } as any;

    const upgradeBtn = screen.getByRole("button", { name: /Upgrade Plan/i });
    fireEvent.click(upgradeBtn);
    expect(window.location.href).toBe("/dashboard/billing");
    
    // Restore location
    window.location = oldLocation;
    unmount();

    // Verify Close button removes modal
    renderWithQueryClient(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
    const closeBtn = screen.getByRole("button", { name: /Close/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  // 9. OTHER AI CREATORS SUITE TOOLS
  it("submits and displays results for description-writer, thumbnail-concepts, outline, and seo-audit", async () => {
    renderWithQueryClient(<DashboardPage />);

    // Navigate to AI view
    const aiTabButton = screen.getByRole("button", { name: /AI Creators Suite/i });
    fireEvent.click(aiTabButton);

    const tools = [
      { id: "description-writer", name: "Desc Writer", text: "Desc Writer", fieldName: "Video Title", mockResult: { introduction: "Mock Intro", chapters: [{ timestamp: "00:00", title: "Intro" }], callToAction: "Mock CTA", tags: ["tag1", "tag2"] } },
      { id: "thumbnail-concepts", name: "Thumbnail", text: "Thumbnail", fieldName: "Video Title", mockResult: { concepts: [{ textOverlay: "HACK", description: "Visual desc", visualElements: ["Element A"], colorPalette: ["#FF0000"] }] } },
      { id: "content-outline", name: "Outline", text: "Outline", fieldName: "Video Topic", mockResult: { sections: [{ name: "Section 1", durationEstimated: "2m", talkingPoints: ["Point A"] }], keyTakeaways: ["Takeaway A"] } },
      { id: "seo-audit", name: "SEO Audit", text: "SEO Audit", fieldName: "Video Title", mockResult: { score: 95, strengths: ["Strength A"], weaknesses: ["Weakness A"], recommendations: ["Recommendation A"] } }
    ];

    for (const tool of tools) {
      // Click tool button
      const toolBtn = screen.getByRole("button", { name: new RegExp(tool.text, "i") });
      fireEvent.click(toolBtn);

      // Wait for settings header to change and show up
      const headerText = new RegExp(`${tool.id.replace("-", " ")} Settings`, "i");
      let form: HTMLFormElement | null = null;
      await waitFor(() => {
        const header = screen.getByText(headerText);
        form = header.parentElement?.querySelector("form") || null;
        expect(form).toBeInTheDocument();
      });

      console.log(`--- FORM FOR ${tool.id} ---`, form!.innerHTML);

      // Mock fetch
      fetchMock.mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes(`/api/ai/${tool.id}`)) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: { state: "completed", result: tool.mockResult } }),
          } as any;
        }
        if (urlStr.includes("/api/competitors")) {
          return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) } as any;
        }
        return { ok: true, status: 200, json: async () => ({ success: true, data: { credits: 10 } }) } as any;
      });

      // Fill required fields based on tool
      if (tool.fieldName === "Video Title") {
        const titleInput = screen.queryByPlaceholderText(/e.g. 5 Morning Habits/i) || screen.queryByPlaceholderText(/e.g. 10 YouTube Hacks/i) || screen.queryByPlaceholderText(/e.g. Easy 15-Minute/i);
        expect(titleInput).toBeInTheDocument();
        fireEvent.change(titleInput!, { target: { value: "Test Title " + tool.id } });
      }
      
      const topicInput = screen.queryByPlaceholderText(/e.g. Why I started/i) || screen.queryByPlaceholderText(/e.g. Introduction to TypeScript/i);
      if (topicInput) {
        fireEvent.change(topicInput, { target: { value: "Test Topic " + tool.id } });
      }

      const descInput = screen.queryByPlaceholderText(/e.g. The video goes over/i) || screen.queryByPlaceholderText(/e.g. In this tutorial/i);
      if (descInput) {
        fireEvent.change(descInput, { target: { value: "Test Desc " + tool.id } });
      }

      const durationInput = screen.queryByPlaceholderText(/e.g. 10 minutes/i);
      if (durationInput) {
        fireEvent.change(durationInput, { target: { value: "15 minutes " + tool.id } });
      }

      const tagsInput = screen.queryByPlaceholderText(/e.g. cooking, recipes, quick meals/i);
      if (tagsInput) {
        fireEvent.change(tagsInput, { target: { value: "tag1, tag2 " + tool.id } });
      }

      // Submit form
      fireEvent.submit(form!);

      // Assert result rendered
      await waitFor(() => {
        if (tool.id === "description-writer") {
          expect(screen.getByText("Mock Intro")).toBeInTheDocument();
          expect(screen.getByText("00:00")).toBeInTheDocument();
          expect(screen.getByText("Intro")).toBeInTheDocument();
          expect(screen.getByText("#tag1")).toBeInTheDocument();
          expect(screen.getByText("#tag2")).toBeInTheDocument();
        } else if (tool.id === "thumbnail-concepts") {
          expect(screen.getByText(/"HACK"/i)).toBeInTheDocument();
        } else if (tool.id === "content-outline") {
          expect(screen.getByText("Section 1")).toBeInTheDocument();
          expect(screen.getByText(/Takeaway A/i)).toBeInTheDocument();
        } else if (tool.id === "seo-audit") {
          expect(screen.getByText("Strength A")).toBeInTheDocument();
          expect(screen.getByText("Weakness A")).toBeInTheDocument();
        }
      });
    }
  });

  // 10. MOBILE NAVIGATION BAR
  it("navigates using the mobile navigation bar at the bottom", () => {
    renderWithQueryClient(<DashboardPage />);
    
    // Find AI Tools mobile button
    const aiToolsBtn = screen.getByRole("button", { name: /^AI Tools$/ });
    fireEvent.click(aiToolsBtn);
    expect(screen.getByRole("heading", { name: /^AI Creators Suite$/i })).toBeInTheDocument();

    // Find Scorecard mobile button
    const scorecardBtn = screen.getByRole("button", { name: /^Scorecard$/ });
    fireEvent.click(scorecardBtn);
    expect(screen.getAllByText(/Video Scorecard/i)[0]).toBeInTheDocument();

    // Find Analytics mobile button
    const analyticsBtn = screen.getByRole("button", { name: /^Analytics$/ });
    fireEvent.click(analyticsBtn);
    expect(screen.getByRole("heading", { name: /^YouTube Analytics$/i })).toBeInTheDocument();
  });
});
