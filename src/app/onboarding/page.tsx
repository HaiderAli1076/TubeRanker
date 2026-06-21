"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";

// Types
interface Channel {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
}

interface Competitor {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
}

// Mock Channels for Step 1
const MOCK_CHANNELS: Channel[] = [
  { id: "ch-1", name: "TechByte", avatar: "💻", subscribers: "145K" },
  { id: "ch-2", name: "Cooking with Chloe", avatar: "🍳", subscribers: "24K" },
  { id: "ch-3", name: "Travel Vlogs", avatar: "✈️", subscribers: "8.2K" },
  { id: "ch-4", name: "Gaming Edge", avatar: "🎮", subscribers: "670" },
];

// Mock Competitor Results for Step 2
const MOCK_COMPETITOR_DATABASE: Competitor[] = [
  // Tech category
  { id: "comp-1", name: "Linus Tech Tips", avatar: "⚡", subscribers: "15M" },
  { id: "comp-2", name: "TechCrunch", avatar: "📰", subscribers: "1.2M" },
  { id: "comp-3", name: "TechJoint", avatar: "⚙️", subscribers: "500K" },
  // Cooking category
  { id: "comp-4", name: "Tasty", avatar: "🍰", subscribers: "21M" },
  { id: "comp-5", name: "Gordon Ramsay", avatar: "👨‍🍳", subscribers: "20M" },
  { id: "comp-6", name: "Binging with Babish", avatar: "🥣", subscribers: "9M" },
  // General fallback
  { id: "comp-7", name: "Creator Pro", avatar: "📈", subscribers: "50K" },
  { id: "comp-8", name: "TubeGamer", avatar: "🕹️", subscribers: "120K" },
  { id: "comp-9", name: "SEO Hacks", avatar: "🔍", subscribers: "12K" },
];

export default function OnboardingPage() {
  const router = useRouter();

  // Wizard States
  const [displayStep, setDisplayStep] = useState(1);
  const [animationClass, setAnimationClass] = useState("step-enter");

  // Step 1 States
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1);

  // Step 2 States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Competitor[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Step 3 States
  const [isCompleting, setIsCompleting] = useState(false);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null); // For modal focus restore
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Custom step navigation with animation delay
  const goToStep = (nextStep: number) => {
    setAnimationClass("step-exit");
    setTimeout(() => {
      setDisplayStep(nextStep);
      setAnimationClass("step-enter");
    }, 200);
  };

  // Step 1: Click outside dropdown to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Step 1: Accessible dropdown keyboard navigation
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsDropdownOpen(true);
        setFocusedOptionIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        setIsDropdownOpen(false);
        triggerButtonRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedOptionIndex((prev) => (prev + 1) % MOCK_CHANNELS.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedOptionIndex((prev) => (prev - 1 + MOCK_CHANNELS.length) % MOCK_CHANNELS.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedOptionIndex >= 0 && focusedOptionIndex < MOCK_CHANNELS.length) {
          const ch = MOCK_CHANNELS[focusedOptionIndex];
          if (ch) {
            setSelectedChannel(ch);
          }
          setIsDropdownOpen(false);
          triggerButtonRef.current?.focus();
        }
        break;
      case "Tab":
        setIsDropdownOpen(false);
        break;
      default:
        break;
    }
  };

  // Step 1: Focus trap for Alert Dialog confirmation modal
  useEffect(() => {
    if (!isModalOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Find focusable elements
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Set initial focus to Cancel/Go Back button to avoid accidental action trigger
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        skipButtonRef.current?.focus();
        return;
      }

      if (e.key === "Tab") {
        if (e.shiftKey) {
          // Shift + Tab: Go backward
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab: Go forward
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  // Step 2: Search Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setDebouncedQuery("");
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Step 2: Filter competitor database based on query
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const query = debouncedQuery.toLowerCase();
    let results: Competitor[] = [];

    if (query.includes("tech")) {
      results = MOCK_COMPETITOR_DATABASE.filter((c) => ["comp-1", "comp-2", "comp-3"].includes(c.id));
    } else if (query.includes("cook")) {
      results = MOCK_COMPETITOR_DATABASE.filter((c) => ["comp-4", "comp-5", "comp-6"].includes(c.id));
    } else {
      // Fallback
      results = MOCK_COMPETITOR_DATABASE.filter((c) =>
        c.name.toLowerCase().includes(query) || ["comp-7", "comp-8", "comp-9"].includes(c.id)
      );
    }

    setSearchResults(results);
    setIsSearching(false);
  }, [debouncedQuery]);

  const handleCompetitorToggle = (compId: string) => {
    setSelectedCompetitors((prev) =>
      prev.includes(compId) ? prev.filter((id) => id !== compId) : [...prev, compId]
    );
  };

  // Step 3: 2-second custom confetti burst on complete
  useEffect(() => {
    if (!isCompleting) return;

    const canvas = canvasRef.current;
    if (!canvas) {
      // Fallback redirect if canvas doesn't render
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    interface ConfettiParticle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }

    const particles: ConfettiParticle[] = [];
    const colors = ["#8B5CF6", "#10B981", "#FFFFFF"]; // Violet, Emerald, White

    // Generate particles from two bottom corners
    const particleCount = 150;
    for (let i = 0; i < particleCount; i++) {
      const isLeft = i % 2 === 0;
      particles.push({
        x: isLeft ? 0 : canvas.width,
        y: canvas.height * 0.8,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#FFFFFF",
        speedX: (isLeft ? Math.random() * 12 + 8 : -(Math.random() * 12 + 8)),
        speedY: -(Math.random() * 15 + 15),
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 10 - 5,
      });
    }

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 2000) {
        // Redirect to dashboard
        router.push("/dashboard");
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        // Physics update
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.5; // Gravity
        p.speedX *= 0.98; // Friction
        p.rotation += p.rotationSpeed;

        // Draw particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, [isCompleting, router]);

  const triggerConfetti = () => {
    setIsCompleting(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden px-4 py-8">
      {/* Background Orbs */}
      <div
        className="absolute top-[15%] right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4F46E5] blur-[100px] opacity-5 pointer-events-none animate-orb-1"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[15%] left-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] blur-[100px] opacity-5 pointer-events-none animate-orb-2"
        aria-hidden="true"
      />

      {/* HTML5 Confetti Canvas */}
      {isCompleting && (
        <canvas
          ref={canvasRef}
          data-testid="confetti-canvas"
          className="fixed inset-0 z-50 pointer-events-none w-full h-full"
        />
      )}

      {/* Onboarding Wizard Card */}
      <div
        className={`relative z-10 w-full max-w-lg mx-auto rounded-card bg-card backdrop-blur-[12px] p-6 sm:p-8 shadow-2xl border border-white/[0.08] ${animationClass}`}
        style={{ border: "var(--border)" }}
      >
        {/* Progress Bar & Steps Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center text-xs font-semibold text-text-muted mb-2">
            <span>STEP {displayStep} OF 3</span>
            <span>{displayStep === 1 ? "33%" : displayStep === 2 ? "66%" : "100%"} Complete</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={displayStep === 1 ? 33 : displayStep === 2 ? 66 : 100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Onboarding step ${displayStep} of 3`}
            className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: displayStep === 1 ? "33%" : displayStep === 2 ? "66%" : "100%" }}
            />
          </div>
        </div>

        {/* ================= STEP 1: CHANNEL CONNECTION ================= */}
        {displayStep === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Let&apos;s grow your channel
            </h1>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              Connect your YouTube channel to start auditing metrics, tags, and tracking video optimizations.
            </p>

            <div className="mt-8 relative" ref={dropdownRef}>
              <label
                id="channel-select-label"
                className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2 text-left"
              >
                Select YouTube Channel
              </label>

              <button
                ref={triggerButtonRef}
                id="channel-select-button"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                aria-controls="channel-listbox"
                aria-labelledby="channel-select-label channel-select-button"
                onKeyDown={handleDropdownKeyDown}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 bg-white/5 border border-white/10 hover:border-white/20 transition-all py-3 px-4 rounded-button text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                {selectedChannel ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-6 h-6 flex items-center justify-center bg-white/5 rounded-full" aria-hidden="true">
                      {selectedChannel.avatar}
                    </span>
                    <span className="font-semibold text-text-primary text-left">
                      {selectedChannel.name}
                      <span className="block text-[10px] text-text-muted font-normal mt-0.5">
                        {selectedChannel.subscribers} subscribers
                      </span>
                    </span>
                  </div>
                ) : (
                  <span className="text-text-muted">Choose your YouTube channel...</span>
                )}
                <svg
                  className={`h-4 w-4 text-text-muted transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div
                  id="channel-listbox"
                  role="listbox"
                  aria-labelledby="channel-select-label"
                  className="absolute left-0 right-0 mt-2 z-20 rounded-card bg-[#111115] border border-white/10 shadow-2xl py-1 overflow-hidden"
                >
                  {MOCK_CHANNELS.map((channel, index) => {
                    const isSelected = selectedChannel?.id === channel.id;
                    const isFocused = focusedOptionIndex === index;
                    return (
                      <div
                        key={channel.id}
                        id={`channel-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={0}
                        onClick={() => {
                          setSelectedChannel(channel);
                          setIsDropdownOpen(false);
                          triggerButtonRef.current?.focus();
                        }}
                        onMouseEnter={() => setFocusedOptionIndex(index)}
                        className={`flex items-center justify-between gap-3 py-3 px-4 text-sm cursor-pointer transition-colors focus:outline-none ${
                          isSelected
                            ? "bg-primary/20 text-text-primary font-semibold"
                            : isFocused
                            ? "bg-white/5 text-text-primary"
                            : "text-text-muted hover:bg-white/5 hover:text-text-primary"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl w-6 h-6 flex items-center justify-center bg-white/5 rounded-full" aria-hidden="true">
                            {channel.avatar}
                          </span>
                          <span className="text-left font-medium">
                            {channel.name}
                            <span className="block text-[10px] opacity-75 font-normal mt-0.5">
                              {channel.subscribers} subscribers
                            </span>
                          </span>
                        </div>
                        {isSelected && (
                          <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <button
                disabled={!selectedChannel}
                onClick={() => goToStep(2)}
                className={`w-full py-3 px-4 font-semibold text-sm rounded-button transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                  selectedChannel
                    ? "bg-primary hover:bg-primary/95 text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(139,92,246,0.25)]"
                    : "bg-white/5 text-text-muted cursor-not-allowed"
                }`}
              >
                Connect Channel
              </button>

              <button
                ref={skipButtonRef}
                onClick={() => setIsModalOpen(true)}
                className="w-full text-center text-xs text-text-muted font-bold hover:text-text-primary py-2 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
              >
                I&apos;ll do this later
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: COMPETITOR TRACKING ================= */}
        {displayStep === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Who are you competing with?
            </h1>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              Add similar channels to track competitor content strategies, tags, and keywords.
            </p>

            <div className="mt-8">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  maxLength={100}
                  placeholder="Search competitor channel name (e.g. tech, cooking)..."
                  className="w-full bg-white/5 border border-white/10 focus:border-primary py-3 pl-10 pr-4 rounded-button text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all"
                />
              </div>

              {/* Competitor Search Results Dropdown/Listing */}
              <div className="mt-4">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted animate-pulse">
                    <svg className="animate-spinner h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching channels...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {searchResults.map((comp) => {
                      const isSelected = selectedCompetitors.includes(comp.id);
                      return (
                        <button
                          key={comp.id}
                          onClick={() => handleCompetitorToggle(comp.id)}
                          className={`flex w-full items-center justify-between gap-3 p-3 rounded-card text-left transition-all border ${
                            isSelected
                              ? "bg-primary/10 border-primary shadow-[0_0_8px_rgba(139,92,246,0.15)]"
                              : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]"
                          } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl w-8 h-8 flex items-center justify-center bg-white/5 rounded-full" aria-hidden="true">
                              {comp.avatar}
                            </span>
                            <div>
                              <span className="font-semibold text-sm text-text-primary block">
                                {comp.name}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                {comp.subscribers} subscribers
                              </span>
                            </div>
                          </div>
                          {isSelected ? (
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary text-white text-xs">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center rounded-full border border-white/20 text-transparent text-xs" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : searchQuery.trim() !== "" ? (
                  <div className="text-center py-6 text-sm text-text-muted">
                    No matching competitors found. Try &quot;tech&quot; or &quot;cooking&quot;.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <button
                onClick={() => goToStep(3)}
                className="w-full bg-primary hover:bg-primary/95 text-white font-semibold text-sm py-3 px-4 rounded-button transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(139,92,246,0.25)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                {selectedCompetitors.length > 0
                  ? `Add Competitor (${selectedCompetitors.length})`
                  : "Add Competitor"}
              </button>

              <button
                onClick={() => goToStep(3)}
                className="w-full text-center text-xs text-text-muted font-bold hover:text-text-primary py-2 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: SUCCESS & TOOLKIT ================= */}
        {displayStep === 3 && (
          <div>
            <div className="flex justify-center mb-4 text-accent">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              You&apos;re all set!
            </h1>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              Your dashboard and optimized growth toolkit are prepared. Let&apos;s unlock your channel stats.
            </p>

            {/* 3-Column Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
              <div className="bg-white/5 border border-white/10 rounded-card p-4 flex flex-col items-center text-center">
                <span className="text-2xl mb-2" aria-hidden="true">⚡</span>
                <h3 className="text-xs font-semibold text-text-primary">AI Title Generator</h3>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-card p-4 flex flex-col items-center text-center">
                <span className="text-2xl mb-2" aria-hidden="true">👁️</span>
                <h3 className="text-xs font-semibold text-text-primary">Competitor Tracking</h3>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-card p-4 flex flex-col items-center text-center">
                <span className="text-2xl mb-2" aria-hidden="true">🔍</span>
                <h3 className="text-xs font-semibold text-text-primary">SEO Audit</h3>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={triggerConfetti}
                disabled={isCompleting}
                className="w-full bg-primary hover:bg-primary/95 text-white font-semibold text-sm py-3 px-4 rounded-button transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(139,92,246,0.25)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isCompleting ? "Loading Dashboard..." : "Go to Dashboard"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= STEP 1 MODAL (ALERT DIALOG) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay background */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-[#0A0A0C]/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div
            ref={modalRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-desc"
            className="relative w-full max-w-sm rounded-modal bg-[#111115] p-6 shadow-2xl border border-white/10 text-center z-10"
          >
            <div className="flex justify-center mb-4 text-[#F59E0B]">
              <div className="w-12 h-12 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            <h2 id="modal-title" className="text-lg font-bold text-text-primary">
              Are you sure?
            </h2>
            <p id="modal-desc" className="mt-2 text-xs text-text-muted leading-relaxed">
              Skipping channel connection will limit our ability to audit your tags, description, and keywords.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  goToStep(2);
                }}
                className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-text-primary text-xs font-semibold rounded-button transition-colors focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#111115]"
              >
                Yes, skip connection
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  triggerButtonRef.current?.focus();
                }}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-button transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#111115]"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
