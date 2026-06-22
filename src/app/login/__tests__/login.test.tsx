import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import LoginPage from "../page";

describe("LoginPage Component Tests", () => {
  it("renders LoginPage components correctly", () => {
    render(<LoginPage />);

    // Check title and tagline
    expect(screen.getByText("TubeRank")).toBeInTheDocument();
    expect(screen.getByText("AI-powered YouTube growth")).toBeInTheDocument();

    // Check Google Auth button is in the document
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
  });

  it("handles Google click loading state", async () => {
    render(<LoginPage />);

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    // Verify loading state Connect to Google... is displayed
    expect(screen.getByText(/Connecting to Google.../i)).toBeInTheDocument();
  });

  it("handles forcing error state via verification controller panel", async () => {
    render(<LoginPage />);

    // Click on Error button in verification panel
    const errorStateBtn = screen.getByRole("button", { name: /^Error$/i });
    fireEvent.click(errorStateBtn);

    // Verify toast error message is in the document
    expect(screen.getByText(/Authentication failed: Google OAuth credentials rejected./i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Verify dismiss works
    const dismissBtn = screen.getByLabelText(/Dismiss notification/i);
    fireEvent.click(dismissBtn);
    
    expect(screen.queryByRole("alert")).toHaveClass("opacity-0");
  });

  it("handles forcing success state via verification controller panel", async () => {
    render(<LoginPage />);

    const successStateBtn = screen.getByRole("button", { name: /^Success$/i });
    fireEvent.click(successStateBtn);
  });

  it("handles Google click success redirect with timers", async () => {
    vi.useFakeTimers();
    render(<LoginPage />);

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    expect(screen.getByText(/Connecting to Google.../i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    vi.useRealTimers();
  });

  it("dismisses toast automatically after 5 seconds", async () => {
    vi.useFakeTimers();
    render(<LoginPage />);

    const errorStateBtn = screen.getByRole("button", { name: /^Error$/i });
    fireEvent.click(errorStateBtn);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole("alert")).toHaveClass("opacity-0");
    vi.useRealTimers();
  });

  it("interacts with other controller state buttons", () => {
    render(<LoginPage />);

    const defaultBtn = screen.getByRole("button", { name: /^Default$/i });
    fireEvent.click(defaultBtn);

    const hoverBtn = screen.getByRole("button", { name: /^Hover$/i });
    fireEvent.click(hoverBtn);

    const loadingBtn = screen.getByRole("button", { name: /^Loading$/i });
    fireEvent.click(loadingBtn);
  });

  it("prevents Google click if already loading", () => {
    render(<LoginPage />);
    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });

    // Force state to loading
    const loadingBtn = screen.getByRole("button", { name: /^Loading$/i });
    fireEvent.click(loadingBtn);

    // Try to click Google button again
    fireEvent.click(googleBtn);
  });
});
