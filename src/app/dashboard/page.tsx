"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable prefer-const */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import posthog from "posthog-js";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Interfaces for YouTube and Competitor data
export interface CompetitorItem {
  id: string;
  name: string;
  youtubeId: string;
  createdAt: string;
}

export interface KeywordSuggestionItem {
  keyword: string;
  volume: number;
}

export interface KeywordSearchResponse {
  keyword: string;
  volume: number;
  suggestions: KeywordSuggestionItem[];
}

export interface VideoHistoryItem {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  publishedAt: string;
}

export interface ChannelAnalyticsResponse {
  channel: {
    id: string;
    youtubeId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    publishedAt: string;
  };
  stats: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
    hiddenSubscriberCount: boolean;
  };
  history: VideoHistoryItem[];
  nextCursor: string | null;
}

// 1. Fetch helpers for TanStack Query
async function fetchCompetitors(): Promise<CompetitorItem[]> {
  const res = await fetch("/api/competitors");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to fetch competitors");
  return json.data || [];
}

async function addCompetitor(youtubeId: string): Promise<CompetitorItem> {
  const res = await fetch("/api/competitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtubeId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to track competitor");
  
  // Track in PostHog
  posthog.capture("competitor_added", { youtubeId, competitorName: json.data?.name });

  return json.data;
}

async function removeCompetitor(id: string): Promise<unknown> {
  const res = await fetch(`/api/competitors?id=${id}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to untrack competitor");
  return json;
}

async function fetchKeywordSearch(query: string): Promise<KeywordSearchResponse | null> {
  if (!query) return null;
  const res = await fetch(`/api/keywords/search?q=${encodeURIComponent(query)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to search keyword");
  return json.data;
}

async function fetchChannelAnalytics(channelId: string): Promise<ChannelAnalyticsResponse | null> {
  if (!channelId) return null;
  const res = await fetch(`/api/channels/${channelId}/analytics`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to fetch channel analytics");
  
  // Track in PostHog
  posthog.capture("scorecard_generated", { channelId, channelTitle: json.data?.channel?.title });

  return json.data;
}

type AiJobStatus = "idle" | "submitting" | "waiting" | "active" | "completed" | "failed";

function AiJobProgress({ status }: { status: AiJobStatus }) {
  const steps = [
    { key: "submitting", label: "Submitting" },
    { key: "waiting", label: "Queued" },
    { key: "active", label: "Processing" },
    { key: "completed", label: "Done" },
  ] as const;

  const stageIndex =
    status === "submitting" ? 0 : status === "waiting" ? 1 : status === "active" ? 2 : -1;

  return (
    <div className="w-full">
      <div className="relative flex items-start justify-between">
        <div className="absolute left-[12%] right-[12%] top-4 h-0.5 bg-border" aria-hidden="true" />
        <div
          className="absolute left-[12%] top-4 h-0.5 bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(0, (stageIndex / 3) * 76)}%` }}
          aria-hidden="true"
        />
        {steps.map((step, i) => {
          const isActive = i === stageIndex;
          const isComplete = i < stageIndex;
          return (
            <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                  isComplete
                    ? "border-indigo-500 bg-indigo-500/25 text-indigo-300"
                    : isActive
                      ? "border-indigo-400 bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-500/50"
                      : "border-border bg-background text-text-muted"
                }`}
              >
                {isComplete ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  isActive || isComplete ? "text-indigo-400" : "text-text-muted"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SeoScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const strokeColor = score >= 80 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
  const textColor =
    score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--border-color)" strokeWidth="6" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <div className={`text-2xl font-black ${textColor}`}>{score}</div>
        <div className="text-[9px] font-semibold uppercase text-text-muted">/ 100</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // States
  const [keywordInput, setKeywordInput] = useState("");
  const [activeKeywordSearch, setActiveKeywordSearch] = useState("");
  const [channelInput, setChannelInput] = useState(""); // No default — prevents auto-fetch on load
  const [activeChannelId, setActiveChannelId] = useState("");
  const [newCompetitorId, setNewCompetitorId] = useState("");

  // AI Suite states
  const [activeTab, setActiveTab] = useState<"analytics" | "ai-suite">("analytics");
  const [selectedTool, setSelectedTool] = useState<
    "title-generator" | "description-writer" | "thumbnail-concepts" | "content-outline" | "seo-audit"
  >("title-generator");

  // Input states
  const [aiTopic, setAiTopic] = useState("");
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiTags, setAiTags] = useState("");
  const [aiDuration, setAiDuration] = useState("10 minutes");

  // Submission / Polling states
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "submitting" | "waiting" | "active" | "completed" | "failed">("idle");
  const [aiErrorMsg, setAiErrorMsg] = useState("");
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);
  const [copyToastPhase, setCopyToastPhase] = useState<"enter" | "exit" | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Poll job status every 2s
  useEffect(() => {
    if (!pollingJobId) return;

    let intervalId: NodeJS.Timeout;
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${pollingJobId}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Polling failed");
        }

        const { state, result, reason } = json.data;
        if (state === "completed") {
          setAiStatus("completed");
          setAiResult(result);
          setPollingJobId(null);
        } else if (state === "failed") {
          setAiStatus("failed");
          setAiErrorMsg(reason || "Job failed on worker");
          setPollingJobId(null);
        } else {
          setAiStatus(state); // 'waiting' or 'active'
        }
      } catch (err: any) {
        setAiStatus("failed");
        setAiErrorMsg(err.message || "Network error while polling status");
        setPollingJobId(null);
      }
    };

    poll(); // Initial check
    intervalId = setInterval(poll, 2000);

    return () => clearInterval(intervalId);
  }, [pollingJobId]);

  // 2. TanStack Queries & Mutations
  const { data: competitors, isLoading: isLoadingComp } = useQuery<CompetitorItem[]>({
    queryKey: ["competitors"],
    queryFn: fetchCompetitors,
  });

  const {
    data: keywordData,
    isLoading: isLoadingKeyword,
    error: keywordError,
  } = useQuery<KeywordSearchResponse | null>({
    queryKey: ["keywordSearch", activeKeywordSearch],
    queryFn: () => fetchKeywordSearch(activeKeywordSearch),
    enabled: !!activeKeywordSearch,
  });

  const {
    data: channelData,
    isLoading: isLoadingChannel,
    error: channelError,
  } = useQuery<ChannelAnalyticsResponse | null>({
    queryKey: ["channelAnalytics", activeChannelId],
    queryFn: () => fetchChannelAnalytics(activeChannelId),
    enabled: !!activeChannelId,        // only fetch when user has submitted a channel ID
    staleTime: 5 * 60 * 1000,          // treat data as fresh for 5 minutes (Phase 3 spec)
    refetchOnWindowFocus: false,        // prevent re-deducting credits on tab switch
  });

  const addCompMutation = useMutation<CompetitorItem, Error, string>({
    mutationFn: addCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
      setNewCompetitorId("");
    },
  });

  const removeCompMutation = useMutation<unknown, Error, string>({
    mutationFn: removeCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
    },
  });

  // Handlers
  const handleKeywordSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keywordInput.trim()) {
      setActiveKeywordSearch(keywordInput.trim());
    }
  };

  const handleChannelSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (channelInput.trim()) {
      setActiveChannelId(channelInput.trim());
    }
  };

  const handleAddCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCompetitorId.trim()) {
      addCompMutation.mutate(newCompetitorId.trim());
    }
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiStatus("submitting");
    setAiErrorMsg("");
    setAiResult(null);

    let payload: Record<string, string> = {};
    let endpoint = "";

    switch (selectedTool) {
      case "title-generator":
        payload = { topic: aiTopic, keywords: aiKeywords };
        endpoint = "/api/ai/title-generator";
        break;
      case "description-writer":
        payload = { title: aiTitle, topic: aiTopic };
        endpoint = "/api/ai/description-writer";
        break;
      case "thumbnail-concepts":
        payload = { title: aiTitle, description: aiDescription };
        endpoint = "/api/ai/thumbnail-concepts";
        break;
      case "content-outline":
        payload = { topic: aiTopic, targetDuration: aiDuration };
        endpoint = "/api/ai/content-outline";
        break;
      case "seo-audit":
        payload = { title: aiTitle, description: aiDescription, tags: aiTags };
        endpoint = "/api/ai/seo-audit";
        break;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": `idem-${selectedTool}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Submitting request failed");
      }

      // Track in PostHog
      posthog.capture("ai_tool_used", { tool: selectedTool });

      if (json.data.state === "completed") {
        setAiStatus("completed");
        setAiResult(json.data.result);
      } else {
        setAiStatus("waiting");
        setPollingJobId(json.data.jobId);
      }
    } catch (err: any) {
      setAiStatus("failed");
      setAiErrorMsg(err.message || "Failed to initiate AI task");
    }
  };

  const handleCopyTitle = (title: string, index: number) => {
    navigator.clipboard.writeText(title);
    setCopiedTitleIndex(index);
    setCopyToastPhase("enter");
    setTimeout(() => setCopyToastPhase("exit"), 1200);
    setTimeout(() => {
      setCopiedTitleIndex(null);
      setCopyToastPhase(null);
    }, 1500);
  };

  if (!mounted) {
    return null; // Prevent server-side render mismatch
  }

  // Format Recharts data safely
  const chartData =
    channelData?.history?.map((video: VideoHistoryItem) => ({
      title: video.title.slice(0, 15) + "...",
      views: parseInt(video.viewCount, 10) || 0,
      likes: parseInt(video.likeCount, 10) || 0,
    })).reverse() || [];

  return (
    <div className="min-h-screen bg-background text-text-primary p-6 md:p-10 font-sans">
      {/* Header */}
      <header className="mb-8 border-b border-border pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
          TubeRank Analytics Dashboard
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Perform keyword research, track competitors, and view channel analytics details.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border mb-8 gap-4">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "analytics"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          YouTube Analytics
        </button>
        <button
          onClick={() => setActiveTab("ai-suite")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "ai-suite"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          AI Creators Suite
        </button>
      </div>

      {activeTab === "analytics" ? (
        /* Main Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Keyword Research & Competitors */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Keyword Research Panel */}
            <section className="bg-card border border-border rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-indigo-400">Keyword Research</h2>
              <form onSubmit={handleKeywordSearch} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Enter search term..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Keyword Research Content & Pulse Skeletons */}
              {isLoadingKeyword ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-10 bg-slate-800 rounded w-full"></div>
                  <div className="h-6 bg-slate-800 rounded w-2/3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-full"></div>
                    <div className="h-4 bg-slate-800 rounded w-full"></div>
                    <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                  </div>
                </div>
              ) : keywordError ? (
                <p className="text-red-400 text-sm">Failed to search keyword. Ensure you have credits.</p>
              ) : keywordData ? (
                <div className="space-y-4">
                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="text-xs text-text-muted">Main Volume Index</div>
                    <div className="text-2xl font-black text-indigo-300 mt-1">
                      {keywordData.volume.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Related Suggestions
                    </h3>
                    <ul className="space-y-2">
                      {keywordData.suggestions?.map((item: KeywordSuggestionItem, index: number) => (
                        <li
                          key={index}
                          className="flex justify-between items-center bg-background border border-border/50 rounded-lg px-3 py-2 text-sm hover:border-indigo-500/30 transition-colors"
                        >
                          <span className="text-text-primary truncate pr-2">{item.keyword}</span>
                          <span className="text-indigo-400 font-bold text-xs">
                            {item.volume.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-6">
                  Search a keyword to see estimated search volumes. (Costs 1 credit)
                </p>
              )}
            </section>

            {/* Competitors Tracking Panel */}
            <section className="bg-card border border-border rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-purple-400">Competitors Tracker</h2>
              <form onSubmit={handleAddCompetitor} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newCompetitorId}
                  onChange={(e) => setNewCompetitorId(e.target.value)}
                  placeholder="Enter YouTube Channel ID..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={addCompMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Track
                </button>
              </form>

              {/* Competitors List & Skeletons */}
              {isLoadingComp ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-10 bg-slate-800 rounded"></div>
                  <div className="h-10 bg-slate-800 rounded"></div>
                  <div className="h-10 bg-slate-800 rounded"></div>
                </div>
              ) : competitors && competitors.length > 0 ? (
                <ul className="space-y-3">
                  {competitors.map((comp: CompetitorItem) => (
                    <li
                      key={comp.id}
                      className="flex justify-between items-center bg-background border border-border rounded-lg px-4 py-3 text-sm hover:border-purple-500/30 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-text-primary">{comp.name}</div>
                        <div className="text-xs text-text-muted font-mono mt-0.5">{comp.youtubeId}</div>
                      </div>
                      <button
                        onClick={() => removeCompMutation.mutate(comp.id)}
                        disabled={removeCompMutation.isPending}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 transition-colors"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-sm text-center py-6">
                  No competitors tracked yet. Add a Channel ID above.
                </p>
              )}
            </section>

          </div>

          {/* Right Column: Channel Analytics & Performance Charts */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Channel Analytics Panel */}
            <section className="bg-card border border-border rounded-xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-blue-400">Channel Statistics & Performance</h2>
                <form onSubmit={handleChannelSearch} className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    placeholder="YouTube Channel ID or Name..."
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:w-56"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    Analyze
                  </button>
                </form>
              </div>

              {/* Analytics Content & Skeletons */}
              {isLoadingChannel ? (
                <div className="space-y-6">
                  {/* Stats Cards Skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                    <div className="h-24 bg-slate-800 rounded-xl"></div>
                    <div className="h-24 bg-slate-800 rounded-xl"></div>
                    <div className="h-24 bg-slate-800 rounded-xl"></div>
                  </div>
                  {/* Chart Box Skeleton */}
                  <div className="h-72 bg-slate-800 rounded-xl animate-pulse"></div>
                </div>
              ) : channelError ? (
                <p className="text-red-400 text-sm">Failed to retrieve analytics. Make sure the channel ID exists.</p>
              ) : channelData ? (
                <div className="space-y-6">
                  
                  {/* Channel Details Banner */}
                  <div className="flex items-center gap-4 bg-background border border-border rounded-xl p-4">
                    {channelData.channel.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={channelData.channel.thumbnailUrl}
                        alt={channelData.channel.title}
                        className="w-12 h-12 rounded-full border border-border object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-text-primary">{channelData.channel.title}</h3>
                      <p className="text-xs text-text-muted line-clamp-1">{channelData.channel.description}</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-background border border-border rounded-xl p-4 text-center">
                      <div className="text-xs text-text-muted font-semibold uppercase tracking-wider">Subscribers</div>
                      <div className="text-2xl font-black text-blue-400 mt-1">
                        {parseInt(channelData.stats.subscriberCount, 10).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4 text-center">
                      <div className="text-xs text-text-muted font-semibold uppercase tracking-wider">Total Views</div>
                      <div className="text-2xl font-black text-indigo-400 mt-1">
                        {parseInt(channelData.stats.viewCount, 10).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4 text-center">
                      <div className="text-xs text-text-muted font-semibold uppercase tracking-wider">Total Uploads</div>
                      <div className="text-2xl font-black text-purple-400 mt-1">
                        {parseInt(channelData.stats.videoCount, 10).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Recharts Area Chart */}
                  <div className="bg-background border border-border rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider">
                      Recent Videos Views & Performance
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="title" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                            labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="views"
                            name="Views"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorViews)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Video Upload History List */}
                  <div>
                    <h4 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">
                      Video Upload History
                    </h4>
                    <div className="bg-background border border-border rounded-xl divide-y divide-border overflow-hidden">
                      {channelData.history?.map((video: VideoHistoryItem) => (
                        <div key={video.id} className="p-4 flex justify-between items-center hover:bg-card/30 transition-colors">
                          <div className="pr-4">
                            <div className="font-semibold text-text-primary text-sm line-clamp-1">{video.title}</div>
                            <div className="text-xs text-text-muted mt-1">
                              Uploaded: {new Date(video.publishedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-4 text-right shrink-0">
                            <div>
                              <div className="text-xs text-text-muted font-semibold uppercase tracking-wider">Views</div>
                              <div className="text-sm font-bold text-text-primary">
                                {parseInt(video.viewCount, 10).toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-text-muted font-semibold uppercase tracking-wider">Likes</div>
                              <div className="text-sm font-bold text-text-primary">
                                {parseInt(video.likeCount, 10).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-12">
                  Search a Channel ID to display metrics.
                </p>
              )}
            </section>

          </div>

        </div>
      ) : (
        /* AI Creators Suite tab content */
        <div className="space-y-6">
          {/* Tool Selection Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { id: "title-generator", name: "Title Gen", cost: 2, color: "text-blue-400" },
              { id: "description-writer", name: "Desc Writer", cost: 3, color: "text-emerald-400" },
              { id: "thumbnail-concepts", name: "Thumbnail", cost: 2, color: "text-amber-400" },
              { id: "content-outline", name: "Outline", cost: 5, color: "text-purple-400" },
              { id: "seo-audit", name: "SEO Audit", cost: 3, color: "text-pink-400" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTool(t.id as any);
                  setAiStatus("idle");
                  setAiResult(null);
                  setAiErrorMsg("");
                }}
                className={`border rounded-xl p-3 text-center transition-all ${
                  selectedTool === t.id
                    ? "bg-card border-border shadow-lg ring-1 ring-border scale-[1.02]"
                    : "bg-background border-border/50 text-text-muted hover:text-text-primary"
                }`}
              >
                <div className={`font-bold text-xs uppercase ${t.color}`}>{t.name}</div>
                <div className="text-[10px] text-text-muted mt-1">{t.cost} Credits</div>
              </button>
            ))}
          </div>

          {/* Form and Preview Pane */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Settings Form Column */}
            <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 shadow-xl h-fit">
              <h3 className="text-lg font-bold mb-4 capitalize text-indigo-400 border-b border-border pb-2">
                {selectedTool.replace("-", " ")} Settings
              </h3>

              <form onSubmit={handleAISubmit} className="space-y-4">
                {/* Title generator fields */}
                {selectedTool === "title-generator" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">VIDEO TOPIC / CONCEPT</label>
                      <input
                        type="text"
                        required
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. Building a SaaS in 24 hours"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">KEYWORDS (OPTIONAL)</label>
                      <input
                        type="text"
                        value={aiKeywords}
                        onChange={(e) => setAiKeywords(e.target.value)}
                        placeholder="e.g. saas, nextjs, building in public"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* Description writer fields */}
                {selectedTool === "description-writer" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">VIDEO TITLE</label>
                      <input
                        type="text"
                        required
                        value={aiTitle}
                        onChange={(e) => setAiTitle(e.target.value)}
                        placeholder="e.g. How I Built a SaaS in 24 Hours (Step-by-Step)"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">CORE TOPICS / DETAILS</label>
                      <textarea
                        required
                        rows={3}
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. Covered planning, choosing the tech stack, integrating stripe..."
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* Thumbnail concepts fields */}
                {selectedTool === "thumbnail-concepts" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">VIDEO TITLE</label>
                      <input
                        type="text"
                        required
                        value={aiTitle}
                        onChange={(e) => setAiTitle(e.target.value)}
                        placeholder="e.g. 10 YouTube Hacks To Grow Fast"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">VIDEO DESCRIPTION / SUMMARY</label>
                      <textarea
                        required
                        rows={3}
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        placeholder="e.g. The video goes over algorithm secrets, CTR tips, and hooks..."
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* Content outline fields */}
                {selectedTool === "content-outline" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">VIDEO TOPIC / GOAL</label>
                      <input
                        type="text"
                        required
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. Introduction to TypeScript Generics"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">TARGET DURATION (OPTIONAL)</label>
                      <input
                        type="text"
                        value={aiDuration}
                        onChange={(e) => setAiDuration(e.target.value)}
                        placeholder="e.g. 10 minutes"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* SEO audit fields */}
                {selectedTool === "seo-audit" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">VIDEO TITLE</label>
                      <input
                        type="text"
                        required
                        value={aiTitle}
                        onChange={(e) => setAiTitle(e.target.value)}
                        placeholder="e.g. Learn NextJS in 10 minutes"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">VIDEO DESCRIPTION</label>
                      <textarea
                        required
                        rows={3}
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        placeholder="e.g. In this tutorial we go over NextJS app router..."
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">TAGS (OPTIONAL)</label>
                      <input
                        type="text"
                        value={aiTags}
                        onChange={(e) => setAiTags(e.target.value)}
                        placeholder="e.g. nextjs, react, frontend, coding"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={aiStatus === "submitting" || aiStatus === "waiting" || aiStatus === "active"}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
                >
                  {aiStatus === "submitting"
                    ? "Submitting Job..."
                    : aiStatus === "waiting" || aiStatus === "active"
                    ? "Queue Active (Polling)..."
                    : "Generate with AI"}
                </button>
              </form>
            </div>

            {/* Preview/Result Column */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-xl min-h-[350px] flex flex-col">
              <h3 className="text-lg font-bold mb-4 text-indigo-400 border-b border-border pb-2">
                AI Output Result
              </h3>

              {/* Idle state */}
              {aiStatus === "idle" && (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted py-12 text-center">
                  <p className="text-sm">Configure parameters on the left and click Generate.</p>
                  <p className="text-xs text-text-muted mt-1">Deducted credits will be fully refunded if the task fails.</p>
                </div>
              )}

              {/* Skeletons while submitting/polling */}
              {(aiStatus === "submitting" || aiStatus === "waiting" || aiStatus === "active") && (
                <div className="space-y-6 flex-1 justify-center flex flex-col py-6">
                  <AiJobProgress status={aiStatus} />
                  <div className="space-y-4 animate-pulse">
                    <div className="h-6 bg-slate-800 rounded w-1/3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-full"></div>
                      <div className="h-4 bg-slate-800 rounded w-full"></div>
                      <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {aiStatus === "failed" && (
                <div className="flex-1 flex flex-col items-center justify-center text-red-400 py-12 text-center">
                  <p className="font-bold text-sm">AI Task Failed</p>
                  <p className="text-xs mt-1 text-red-500/80 max-w-md">{aiErrorMsg}</p>
                  <p className="text-xs text-text-muted mt-4">Your credit balance has been refunded.</p>
                </div>
              )}

              {/* Completed state / Result Rendering */}
              {aiStatus === "completed" && aiResult && (
                <div className="flex-1 space-y-6">
                  
                  {/* 1. Title Generator Result rendering */}
                  {selectedTool === "title-generator" && aiResult.titles && (
                    <div className="space-y-4">
                      {aiResult.titles.map((t: any, i: number) => (
                        <div key={i} className="bg-background border border-border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-500/30 transition-all">
                          <div className="space-y-1 flex-1">
                            <h4 className="font-bold text-text-primary text-base">"{t.title}"</h4>
                            <p className="text-xs text-text-muted font-medium">{t.rationale}</p>
                          </div>
                          <div className="relative shrink-0">
                            <button
                              onClick={() => handleCopyTitle(t.title, i)}
                              className="text-xs font-semibold bg-card border border-border text-indigo-400 hover:text-indigo-300 rounded-lg px-3 py-1.5 transition-colors"
                            >
                              Copy Title
                            </button>
                            {copiedTitleIndex === i && copyToastPhase && (
                              <span
                                className={`absolute -top-9 right-0 flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-400 ${
                                  copyToastPhase === "enter" ? "step-enter" : "step-exit"
                                }`}
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Copied!
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 2. Description Writer Result rendering */}
                  {selectedTool === "description-writer" && (
                    <div className="space-y-4 bg-background border border-border rounded-xl p-6">
                      <div>
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Introduction Summary</h4>
                        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{aiResult.introduction}</p>
                      </div>
                      
                      {aiResult.chapters && aiResult.chapters.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Chapters / Timestamps</h4>
                          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                            {aiResult.chapters.map((ch: any, i: number) => (
                              <div key={i} className="flex gap-4 p-3 text-sm hover:bg-card/20">
                                <span className="font-mono text-indigo-400 font-bold">{ch.timestamp}</span>
                                <span className="text-text-primary">{ch.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Call To Action</h4>
                        <p className="text-sm text-text-primary leading-relaxed italic">{aiResult.callToAction}</p>
                      </div>

                      {aiResult.tags && aiResult.tags.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {aiResult.tags.map((tag: string, i: number) => (
                              <span key={i} className="text-xs bg-card border border-border text-text-muted rounded-full px-2.5 py-1">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Thumbnail Concepts Result rendering */}
                  {selectedTool === "thumbnail-concepts" && aiResult.concepts && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {aiResult.concepts.map((c: any, i: number) => (
                        <div key={i} className="bg-background border border-border rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all text-left">
                          <div className="space-y-3">
                            <div className="bg-card border border-border rounded-lg px-3 py-2 text-center font-black text-amber-300 tracking-wide text-xs">
                              "{c.textOverlay.toUpperCase()}"
                            </div>
                            <p className="text-xs text-text-primary leading-relaxed">{c.description}</p>
                            
                            <div>
                              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Visual Elements</div>
                              <ul className="text-xs text-text-muted space-y-1 list-disc pl-3.5">
                                {c.visualElements?.map((el: string, idx: number) => (
                                  <li key={idx}>{el}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-border">
                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Color Palette</div>
                            <div className="flex gap-1 flex-wrap">
                              {c.colorPalette?.map((color: string, idx: number) => (
                                <span key={idx} className="text-[9px] bg-card border border-border text-amber-400 rounded px-1.5 py-0.5 whitespace-nowrap">
                                  {color}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 4. Content Outline Result rendering */}
                  {selectedTool === "content-outline" && (
                    <div className="space-y-4">
                      {aiResult.sections && aiResult.sections.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Video Structure</h4>
                          <div className="space-y-3">
                            {aiResult.sections.map((sec: any, i: number) => (
                              <div key={i} className="bg-background border border-border rounded-xl p-4 hover:border-purple-500/30 transition-all text-left">
                                <div className="flex justify-between items-center border-b border-border pb-2 mb-2.5">
                                  <span className="font-bold text-purple-300 text-sm">{sec.name}</span>
                                  <span className="text-xs bg-card text-text-muted px-2 py-0.5 rounded font-mono">{sec.durationEstimated}</span>
                                </div>
                                <ul className="text-xs text-text-primary space-y-1.5 list-disc pl-4">
                                  {sec.talkingPoints?.map((tp: string, idx: number) => (
                                    <li key={idx}>{tp}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiResult.keyTakeaways && aiResult.keyTakeaways.length > 0 && (
                        <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 text-left">
                          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Key Takeaways</h4>
                          <div className="text-xs text-text-primary space-y-1.5">
                            {aiResult.keyTakeaways.map((kt: string, i: number) => (
                              <span key={i} className="block text-text-primary">💡 {kt}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. SEO Audit Result rendering */}
                  {selectedTool === "seo-audit" && (
                    <div className="space-y-4">
                      {/* Score dial */}
                      <div className="bg-background border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">SEO Optimization Score</h4>
                          <p className="text-xs text-text-muted font-medium">Overall checklist score based on metadata</p>
                        </div>
                        <SeoScoreRing score={aiResult.score} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="bg-background border border-border rounded-xl p-4">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5">Strengths</h4>
                          <ul className="text-xs text-text-primary space-y-1.5">
                            {aiResult.strengths?.map((str: string, i: number) => (
                              <li key={i} className="flex gap-2 items-start">
                                <span className="text-emerald-400 font-bold">✓</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-background border border-border rounded-xl p-4">
                          <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2.5">Areas for Improvement</h4>
                          <ul className="text-xs text-text-primary space-y-1.5">
                            {aiResult.weaknesses?.map((weak: string, i: number) => (
                              <li key={i} className="flex gap-2 items-start">
                                <span className="text-pink-400 font-bold">⚠</span>
                                <span>{weak}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-background border border-border rounded-xl p-4 text-left">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Recommendations</h4>
                        <ul className="text-xs text-text-primary space-y-1.5">
                          {aiResult.recommendations?.map((rec: string, i: number) => (
                            <li key={i} className="flex gap-2 items-start">
                              <span className="text-indigo-400 font-bold">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {aiResult.suggestedKeywords && aiResult.suggestedKeywords.length > 0 && (
                        <div className="bg-background border border-border rounded-xl p-4 text-left">
                          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">Suggested Keywords</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {aiResult.suggestedKeywords.map((kw: string, i: number) => (
                              <span key={i} className="text-xs bg-card border border-border text-indigo-300 rounded px-2 py-0.5">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
