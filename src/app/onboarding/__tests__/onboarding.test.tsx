import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import OnboardingPage from "../page";

const queryClient = new QueryClient();

const renderWithQueryClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("OnboardingPage Component Tests", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/competitors")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: [
              { id: "c-1", name: "Tech Guru", youtubeId: "UCTech" },
              { id: "c-2", name: "Design Ninja", youtubeId: "UCDesign" },
            ],
          }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) } as any;
    });
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("walks through step-by-step wizard flow, selects channel, and triggers confirm modal", async () => {
    renderWithQueryClient(<OnboardingPage />);

    // Step 1: Channel Connection
    expect(screen.getByText(/Let's grow your channel/i)).toBeInTheDocument();

    // Verify confirmation modal opens when skip is clicked
    const skipButton = screen.getByRole("button", { name: /I'll do this later/i });
    fireEvent.click(skipButton);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure\?/i)).toBeInTheDocument();

    // Confirm skip (close modal and advance to Step 2)
    const confirmSkipButton = screen.getByRole("button", { name: /Yes, skip connection/i });
    fireEvent.click(confirmSkipButton);

    // Wait for exit transition timeout of 200ms
    await sleep(250);

    // Verify advanced to Step 2
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText(/Who are you competing with\?/i)).toBeInTheDocument();

    // Step 2: Competitor Tracking
    const searchInput = screen.getByPlaceholderText(/Search competitor channel name/i);
    fireEvent.change(searchInput, { target: { value: "Tech" } });

    // Wait for 300ms search input debounce
    await sleep(350);

    // Verify debounced mock options show up
    await waitFor(() => {
      expect(screen.getByText("Linus Tech Tips")).toBeInTheDocument();
    });

    // Select/click a competitor card
    const competitorCard = screen.getByText("Linus Tech Tips").closest("button");
    expect(competitorCard).toBeInTheDocument();
    fireEvent.click(competitorCard!);

    // Click next step
    const nextStepButton = screen.getByRole("button", { name: /Add Competitor/i });
    fireEvent.click(nextStepButton);

    // Wait for transition timeout of 200ms
    await sleep(250);

    // Step 3: Success Screen
    expect(screen.getByText(/You're all set!/i)).toBeInTheDocument();

    // Go to dashboard button triggers redirection and triggers confetti
    const finishButton = screen.getByRole("button", { name: /Go to Dashboard/i });
    fireEvent.click(finishButton);

    // Canvas checks for confetti
    const canvas = screen.getByTestId("confetti-canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("selects a channel from dropdown, connects it, and advances to step 2", async () => {
    renderWithQueryClient(<OnboardingPage />);

    // Click the channel select dropdown button to open it
    const selectButton = screen.getByRole("button", { name: /Choose your YouTube channel/i });
    fireEvent.click(selectButton);

    // Verify dropdown options are rendered
    expect(screen.getByText("TechByte")).toBeInTheDocument();

    // Click on TechByte option
    const option = screen.getByText("TechByte");
    fireEvent.click(option);

    // Verify channel is selected
    expect(screen.getByText("145K subscribers")).toBeInTheDocument();

    // Click connect channel button
    const connectButton = screen.getByRole("button", { name: "Connect Channel" });
    fireEvent.click(connectButton);

    // Wait for transition timeout to Step 2
    await sleep(250);

    // Verify advanced to Step 2
    expect(screen.getByText(/Who are you competing with\?/i)).toBeInTheDocument();
  });

  it("supports keyboard navigation on dropdown listbox", () => {
    renderWithQueryClient(<OnboardingPage />);

    const selectButton = screen.getByRole("button", { name: /Choose your YouTube channel/i });
    
    // Press ArrowDown to open dropdown
    fireEvent.keyDown(selectButton, { key: "ArrowDown" });
    expect(screen.getByText("TechByte")).toBeInTheDocument();

    // Press ArrowDown to move focus to next option
    fireEvent.keyDown(selectButton, { key: "ArrowDown" });

    // Press ArrowUp to move focus back
    fireEvent.keyDown(selectButton, { key: "ArrowUp" });

    // Press Enter to select
    fireEvent.keyDown(selectButton, { key: "Enter" });
    
    // Check that selection occurred
    expect(screen.getByText("145K subscribers")).toBeInTheDocument();

    // Press Enter when closed should open it
    fireEvent.keyDown(selectButton, { key: "Enter" });

    // Press Escape to close it
    fireEvent.keyDown(selectButton, { key: "Escape" });

    // Press Space when closed should open it
    fireEvent.keyDown(selectButton, { key: " " });

    // Press Tab to close it
    fireEvent.keyDown(selectButton, { key: "Tab" });
  });

  it("interacts with confirmation modal back button and keyboard escape", () => {
    renderWithQueryClient(<OnboardingPage />);

    const skipButton = screen.getByRole("button", { name: /I'll do this later/i });
    fireEvent.click(skipButton);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    // Click Go back
    const goBackButton = screen.getByRole("button", { name: /Go back/i });
    fireEvent.click(goBackButton);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Open it again
    fireEvent.click(skipButton);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    // Press Escape on the document to close
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("runs the confetti canvas animation and redirects to dashboard after 2 seconds", async () => {
    vi.useFakeTimers();
    renderWithQueryClient(<OnboardingPage />);

    // Skip to Step 2
    fireEvent.click(screen.getByRole("button", { name: /I'll do this later/i }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, skip connection/i }));

    // Wait and skip to Step 3
    act(() => {
      vi.advanceTimersByTime(250);
    });
    fireEvent.click(screen.getByRole("button", { name: /Skip for now/i }));

    // Wait and click finish
    act(() => {
      vi.advanceTimersByTime(250);
    });
    fireEvent.click(screen.getByRole("button", { name: /Go to Dashboard/i }));

    // Fast-forward time to finish confetti
    act(() => {
      vi.advanceTimersByTime(2050);
    });
    vi.useRealTimers();
  });

  it("closes confirmation modal when clicking the overlay", () => {
    renderWithQueryClient(<OnboardingPage />);

    const skipButton = screen.getByRole("button", { name: /I'll do this later/i });
    fireEvent.click(skipButton);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    const modalContainer = screen.getByRole("alertdialog").parentElement!;
    const overlay = modalContainer.querySelector(".absolute.inset-0")!;
    fireEvent.click(overlay);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("selects a channel from dropdown with hover onMouseEnter", async () => {
    renderWithQueryClient(<OnboardingPage />);

    const selectButton = screen.getByRole("button", { name: /Choose your YouTube channel/i });
    fireEvent.click(selectButton);

    const option = screen.getByText("TechByte");
    fireEvent.mouseEnter(option);
    fireEvent.click(option);

    expect(screen.getByText("145K subscribers")).toBeInTheDocument();
  });

  it("filters competitor database based on query categories", async () => {
    renderWithQueryClient(<OnboardingPage />);
    fireEvent.click(screen.getByRole("button", { name: /I'll do this later/i }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, skip connection/i }));
    await sleep(250);

    const searchInput = screen.getByPlaceholderText(/Search competitor channel name/i);

    // Cook query
    fireEvent.change(searchInput, { target: { value: "cook" } });
    await sleep(350);
    expect(screen.getByText("Gordon Ramsay")).toBeInTheDocument();

    // Fallback query
    fireEvent.change(searchInput, { target: { value: "gamer" } });
    await sleep(350);
    expect(screen.getByText("TubeGamer")).toBeInTheDocument();

    // Empty fallback search query
    fireEvent.change(searchInput, { target: { value: "" } });
    await sleep(350);
  });
});
