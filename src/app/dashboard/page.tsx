"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable prefer-const */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import posthog from "posthog-js";
import { z } from "zod";
import { useCountUp } from "@/hooks/useCountUp";
// Dynamic imports for Recharts components
import dynamic from "next/dynamic";

const ComposedChart = dynamic(() => import("recharts").then(mod => ({ default: mod.ComposedChart })), { ssr: false });
const Area = dynamic(() => import("recharts").then(mod => ({ default: mod.Area })), { ssr: false });
const Line = dynamic(() => import("recharts").then(mod => ({ default: mod.Line })), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => ({ default: mod.XAxis })), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => ({ default: mod.YAxis })), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(mod => ({ default: mod.Tooltip })), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(mod => ({ default: mod.CartesianGrid })), { ssr: false });

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

// Zod validation schemas for input
const keywordSchema = z
  .string()
  .min(1, "Search term cannot be empty")
  .max(60, "Search term cannot exceed 60 characters");

const channelIdSchema = z
  .string()
  .min(1, "Channel ID cannot be empty")
  .max(40, "Channel ID cannot exceed 40 characters");

const competitorIdSchema = z
  .string()
  .min(1, "Competitor Channel ID cannot be empty")
  .max(40, "Competitor Channel ID cannot exceed 40 characters");

const videoIdSchema = z
  .string()
  .min(1, "Video ID cannot be empty")
  .max(25, "Video ID cannot exceed 25 characters");

const aiTopicSchema = z
  .string()
  .min(1, "Topic/Concept is required")
  .max(100, "Topic cannot exceed 100 characters");

const aiTitleSchema = z
  .string()
  .min(1, "Video Title is required")
  .max(100, "Title cannot exceed 100 characters");

const aiDescriptionSchema = z
  .string()
  .min(1, "Video Description/Summary is required")
  .max(500, "Description cannot exceed 500 characters");

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const getSwatchColor = (name: string, fallback: string) => {
      if (name === "Views") return "#8B5CF6";
      if (name === "Likes") return "#10B981";
      return fallback;
    };
    return (
      <div className="bg-[#111115]/95 border border-white/10 rounded-card p-3 shadow-2xl backdrop-blur-md text-left max-w-[240px]">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
          {data.date}
        </p>
        <p className="text-xs font-bold text-text-primary truncate mb-2" title={data.fullTitle}>
          {data.fullTitle}
        </p>
        <div className="space-y-1.5 border-t border-white/5 pt-1.5">
          {payload.map((item: any) => (
            <div key={item.name} className="flex justify-between items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-text-muted">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getSwatchColor(item.name, item.stroke || item.color) }}
                />
                {item.name}:
              </span>
              <span className="font-extrabold text-text-primary">
                {item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ChannelAvatar = ({ src, title }: { src: string | null | undefined; title: string }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initial = title ? title.trim().charAt(0).toUpperCase() : "?";

  if (!src || hasError) {
    return (
      <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg shrink-0 select-none">
        {initial}
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

const PrimaryButton = ({ children, className = "", ...props }: PrimaryButtonProps) => {
  return (
    <button
      {...props}
      className={`glass-button-primary text-white font-semibold rounded-button hover:scale-[1.01] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // Layout states
  const [currentView, setCurrentView] = useState<"analytics" | "ai-suite" | "scorecard">("analytics");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Offline status & Mutation Queue
  const [isOffline, setIsOffline] = useState(false);
  const [offlineMutationQueue, setOfflineMutationQueue] = useState<any[]>([]);

  // HTTP Handling states (429 countdown, 500 support banner, 402 modal)
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const [supportId, setSupportId] = useState<string | null>(null);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);

  // Form input validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Keyword Research States
  const [keywordInput, setKeywordInput] = useState("");
  const [activeKeywordSearch, setActiveKeywordSearch] = useState("");

  // Channel Stats States
  const [channelInput, setChannelInput] = useState("UCBJycsmduvYEL83R_U4JriQ"); // Default to Marques Brownlee
  const [activeChannelId, setActiveChannelId] = useState("UCBJycsmduvYEL83R_U4JriQ");

  // Competitor Tracker States
  const [newCompetitorId, setNewCompetitorId] = useState("");

  // Toast notification state & handlers
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToastMessage = (message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setToast({
      show: true,
      message,
      type,
    });

    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // AI Suite states
  const [selectedTool, setSelectedTool] = useState<
    "title-generator" | "description-writer" | "thumbnail-concepts" | "content-outline" | "seo-audit"
  >("title-generator");
  const [aiTopic, setAiTopic] = useState("");
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiTags, setAiTags] = useState("");
  const [aiDuration, setAiDuration] = useState("10 minutes");
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "submitting" | "waiting" | "active" | "completed" | "failed">("idle");
  const [aiErrorMsg, setAiErrorMsg] = useState("");
  const [aiResult, setAiResult] = useState<any | null>(null);

  // Video Scorecard States
  const [scorecardVideoIdInput, setScorecardVideoIdInput] = useState("");
  const [scorecardPollingJobId, setScorecardPollingJobId] = useState<string | null>(null);
  const [scorecardStatus, setScorecardStatus] = useState<"idle" | "submitting" | "waiting" | "active" | "completed" | "failed">("idle");
  const [scorecardErrorMsg, setScorecardErrorMsg] = useState("");
  const [scorecardResult, setScorecardResult] = useState<any | null>(null);

  // AbortController refs for unmount cleanup
  const aiPollControllerRef = useRef<AbortController | null>(null);
  const scorecardPollControllerRef = useRef<AbortController | null>(null);

  // 1. Centralized Fetch Wrapper with HTTP status code handling & Auto-retries
  const customFetch = async (url: string, options: RequestInit = {}, retryCount = 0): Promise<any> => {
    try {
      const res = await fetch(url, options);

      // Handle 401: Unauthorized Redirect
      if (res.status === 401) {
        window.location.href = "/login";
        throw new Error("Unauthorized access. Redirecting to login...");
      }

      // Handle 402: Quota Exceeded upgrade trigger
      if (res.status === 402) {
        const resClone = res.clone();
        const json = await resClone.json().catch(() => ({}));
        if (json.error?.code === "QUOTA_EXCEEDED") {
          throw new Error(json.error.message || "AI features are temporarily paused due to system limits. Please try again later.");
        }
        setIsQuotaModalOpen(true);
        throw new Error("Credit quota exceeded. Please upgrade.");
      }

      // Handle 429: Too Many Requests Rate Limiting
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "30", 10) || 30;
        setRateLimitCountdown(retryAfter);
        throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
      }

      // Handle 500: Internal Server Error with retry once & Support ID
      if (res.status === 500) {
        if (retryCount < 1) {
          return customFetch(url, options, retryCount + 1);
        }
        const json = await res.json().catch(() => ({}));
        const supportIdVal = json.error?.supportId || `err-${Math.random().toString(36).substring(2, 9)}`;
        setSupportId(supportIdVal);
        throw new Error(`Internal Server Error. Reference Support ID: ${supportIdVal}`);
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || `Request failed with status ${res.status}`);
      }
      return json;
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw err; // silent pass for aborted requests
      }
      throw err;
    }
  };

  // Mount logic & offline detectors
  useEffect(() => {
    setMounted(true);
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      // Cleanup any active poll fetch controllers
      aiPollControllerRef.current?.abort();
      scorecardPollControllerRef.current?.abort();
    };
  }, []);

  // Sync mutations when network reconnects
  useEffect(() => {
    if (!isOffline && offlineMutationQueue.length > 0) {
      const syncQueue = async () => {
        for (const action of offlineMutationQueue) {
          if (action.type === "addCompetitor") {
            try {
              await addCompMutation.mutateAsync(action.youtubeId);
            } catch (err) {
              console.error("Offline sync competitor add failed", err);
            }
          }
        }
        setOfflineMutationQueue([]);
      };
      syncQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline]);

  // Rate Limiting countdown decrement & auto‑retry
  useEffect(() => {
    if (rateLimitCountdown === null) return;
    if (rateLimitCountdown <= 0) {
      setRateLimitCountdown(null);
      // Auto-retry active queries in background
      queryClient.refetchQueries();
      return;
    }

    const timer = setTimeout(() => {
      setRateLimitCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateLimitCountdown]);

  // Poll AI job status (with AbortController cleanup)
  useEffect(() => {
    if (!pollingJobId) return;

    aiPollControllerRef.current?.abort();
    aiPollControllerRef.current = new AbortController();
    const signal = aiPollControllerRef.current.signal;

    let intervalId: NodeJS.Timeout;
    const poll = async () => {
      try {
        const json = await customFetch(`/api/jobs/${pollingJobId}`, { signal });
        const { state, result, reason } = json.data;
        if (state === "completed") {
          setAiStatus("completed");
          setAiResult(result);
          setPollingJobId(null);
          refetchCredits(); // Refresh credits
        } else if (state === "failed") {
          setAiStatus("failed");
          setAiErrorMsg(reason || "Job failed on worker");
          setPollingJobId(null);
          refetchCredits(); // Refresh credits
        } else {
          setAiStatus(state);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setAiStatus("failed");
          setAiErrorMsg(err.message || "Network error while polling status");
          setPollingJobId(null);
        }
      }
    };

    poll();
    intervalId = setInterval(poll, 2000);

    return () => {
      clearInterval(intervalId);
      aiPollControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingJobId]);

  // Poll Scorecard job status (with AbortController cleanup)
  useEffect(() => {
    if (!scorecardPollingJobId) return;

    scorecardPollControllerRef.current?.abort();
    scorecardPollControllerRef.current = new AbortController();
    const signal = scorecardPollControllerRef.current.signal;

    let intervalId: NodeJS.Timeout;
    const poll = async () => {
      try {
        const json = await customFetch(`/api/jobs/${scorecardPollingJobId}`, { signal });
        const { state, result, reason } = json.data;
        if (state === "completed") {
          setScorecardStatus("completed");
          setScorecardResult(result);
          setScorecardPollingJobId(null);
          refetchCredits(); // Refresh credits
        } else if (state === "failed") {
          setScorecardStatus("failed");
          setScorecardErrorMsg(reason || "Scorecard generation failed");
          setScorecardPollingJobId(null);
          refetchCredits(); // Refresh credits
        } else {
          setScorecardStatus(state);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setScorecardStatus("failed");
          setScorecardErrorMsg(err.message || "Network error while polling scorecard status");
          setScorecardPollingJobId(null);
        }
      }
    };

    poll();
    intervalId = setInterval(poll, 2000);

    return () => {
      clearInterval(intervalId);
      scorecardPollControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scorecardPollingJobId]);

  // TanStack Queries (staleTime 5 minutes)
  const { data: creditsData, refetch: refetchCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async ({ signal }) => {
      const json = await customFetch("/api/user/credits", { signal });
      return json.data;
    },
    staleTime: 300000,
    refetchInterval: 60000, // Refetch every 60 seconds to detect quota changes/resets
  });

  const { data: competitors = [], isLoading: isLoadingComp } = useQuery<CompetitorItem[]>({
    queryKey: ["competitors"],
    queryFn: async ({ signal }) => {
      const json = await customFetch("/api/competitors", { signal });
      return json.data || [];
    },
    staleTime: 300000,
  });

  const {
    data: keywordData,
    isLoading: isLoadingKeyword,
    error: keywordError,
  } = useQuery<KeywordSearchResponse | null>({
    queryKey: ["keywordSearch", activeKeywordSearch],
    queryFn: async ({ signal }) => {
      const json = await customFetch(`/api/keywords/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: activeKeywordSearch }),
        signal,
      });
      refetchCredits(); // Refresh credits count
      return json.data;
    },
    enabled: !!activeKeywordSearch,
    staleTime: 300000,
  });

  const {
    data: channelData,
    isLoading: isLoadingChannel,
    error: channelError,
  } = useQuery<ChannelAnalyticsResponse | null>({
    queryKey: ["channelAnalytics", activeChannelId],
    queryFn: async ({ signal }) => {
      const json = await customFetch(`/api/channels/${activeChannelId}/analytics`, { signal });
      refetchCredits(); // Refresh credits count
      return json.data;
    },
    enabled: !!activeChannelId,
    staleTime: 300000,
    retry: false,
  });

  // Get stat end values for animation when data resolves
  const subscriberEnd = channelData ? parseInt(channelData.stats.subscriberCount, 10) || 0 : 0;
  const viewEnd = channelData ? parseInt(channelData.stats.viewCount, 10) || 0 : 0;
  const videoEnd = channelData ? parseInt(channelData.stats.videoCount, 10) || 0 : 0;

  const animatedSubscribers = useCountUp(subscriberEnd, 600, activeChannelId);
  const animatedViews = useCountUp(viewEnd, 600, activeChannelId);
  const animatedUploads = useCountUp(videoEnd, 600, activeChannelId);

  // Competitor ADD mutation with Optimistic UI updates
  const addCompMutation = useMutation<CompetitorItem, Error, string, { previous: CompetitorItem[] | undefined }>({
    mutationFn: async (youtubeId: string) => {
      const json = await customFetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeId }),
      });
      posthog.capture("competitor_added", { youtubeId, competitorName: json.data?.name });
      return json.data;
    },
    onMutate: async (youtubeId) => {
      await queryClient.cancelQueries({ queryKey: ["competitors"] });
      const previous = queryClient.getQueryData<CompetitorItem[]>(["competitors"]);

      const optimisticItem: CompetitorItem = {
        id: `temp-${Date.now()}`,
        name: `${youtubeId} (Tracking...)`,
        youtubeId,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<CompetitorItem[]>(["competitors"], (old) => [
        optimisticItem,
        ...(old || []),
      ]);

      return { previous };
    },
    onSuccess: (data) => {
      showToastMessage(`Tracking started for ${data.name || "competitor"}.`);
    },
    onError: (err: any, _youtubeId, context) => {
      queryClient.setQueryData(["competitors"], context?.previous);
      showToastMessage(err.message || "Failed to start tracking competitor.", "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
    },
  });

  // Competitor DELETE mutation with Optimistic UI updates
  const removeCompMutation = useMutation<unknown, Error, string, { previous: CompetitorItem[] | undefined }>({
    mutationFn: async (id: string) => {
      return customFetch(`/api/competitors/${id}`, {
        method: "DELETE",
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["competitors"] });
      const previous = queryClient.getQueryData<CompetitorItem[]>(["competitors"]);

      queryClient.setQueryData<CompetitorItem[]>(["competitors"], (old) =>
        (old || []).filter((item) => item.id !== id)
      );

      return { previous };
    },
    onSuccess: () => {
      showToastMessage("Competitor removed successfully.");
    },
    onError: (err: any, _id, context) => {
      queryClient.setQueryData(["competitors"], context?.previous);
      showToastMessage(err.message || "Failed to remove competitor.", "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
    },
  });

  // Form Handlers with Zod Validation
  const handleKeywordSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors((prev) => ({ ...prev, keyword: "" }));

    const parsed = keywordSchema.safeParse(keywordInput.trim());
    if (!parsed.success) {
      setValidationErrors((prev) => ({ ...prev, keyword: parsed.error.issues[0]?.message || "Invalid input" }));
      return;
    }

    setActiveKeywordSearch(parsed.data);
  };

  const handleChannelSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors((prev) => ({ ...prev, channel: "" }));

    const parsed = channelIdSchema.safeParse(channelInput.trim());
    if (!parsed.success) {
      setValidationErrors((prev) => ({ ...prev, channel: parsed.error.issues[0]?.message || "Invalid input" }));
      return;
    }

    setActiveChannelId(parsed.data);
  };

  const handleAddCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors((prev) => ({ ...prev, competitor: "" }));

    const parsed = competitorIdSchema.safeParse(newCompetitorId.trim());
    if (!parsed.success) {
      setValidationErrors((prev) => ({ ...prev, competitor: parsed.error.issues[0]?.message || "Invalid input" }));
      return;
    }

    if (isOffline) {
      // Offline: optimistic append & mutation queue
      const queuedComp: CompetitorItem = {
        id: `temp-offline-${Date.now()}`,
        name: `${parsed.data} (Pending Offline Connection)`,
        youtubeId: parsed.data,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<CompetitorItem[]>(["competitors"], (old) => [
        queuedComp,
        ...(old || []),
      ]);
      setOfflineMutationQueue((prev) => [...prev, { type: "addCompetitor", youtubeId: parsed.data }]);
      setNewCompetitorId("");
      return;
    }

    addCompMutation.mutate(parsed.data);
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setAiStatus("submitting");
    setAiErrorMsg("");
    setAiResult(null);

    let payload: Record<string, string> = {};
    let endpoint = "";

    // Field validations
    try {
      switch (selectedTool) {
        case "title-generator": {
          const topic = aiTopicSchema.parse(aiTopic.trim());
          payload = { topic, keywords: aiKeywords.trim() };
          endpoint = "/api/ai/title-generator";
          break;
        }
        case "description-writer": {
          const title = aiTitleSchema.parse(aiTitle.trim());
          const topic = aiTopicSchema.parse(aiTopic.trim());
          payload = { title, topic };
          endpoint = "/api/ai/description-writer";
          break;
        }
        case "thumbnail-concepts": {
          const title = aiTitleSchema.parse(aiTitle.trim());
          const description = aiDescriptionSchema.parse(aiDescription.trim());
          payload = { title, description };
          endpoint = "/api/ai/thumbnail-concepts";
          break;
        }
        case "content-outline": {
          const topic = aiTopicSchema.parse(aiTopic.trim());
          payload = { topic, targetDuration: aiDuration.trim() };
          endpoint = "/api/ai/content-outline";
          break;
        }
        case "seo-audit": {
          const title = aiTitleSchema.parse(aiTitle.trim());
          const description = aiDescriptionSchema.parse(aiDescription.trim());
          payload = { title, description, tags: aiTags.trim() };
          endpoint = "/api/ai/seo-audit";
          break;
        }
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setAiStatus("idle");
        setValidationErrors((prev) => ({ ...prev, aiSuite: err.issues[0]?.message || "Invalid input" }));
        return;
      }
    }

    try {
      const json = await customFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": `idem-${selectedTool}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        },
        body: JSON.stringify(payload),
      });

      posthog.capture("ai_tool_used", { tool: selectedTool });

      if (json.data.state === "completed") {
        setAiStatus("completed");
        setAiResult(json.data.result);
        refetchCredits(); // Refresh credits balance
      } else {
        setAiStatus("waiting");
        setPollingJobId(json.data.jobId);
      }
    } catch (err: any) {
      setAiStatus("failed");
      setAiErrorMsg(err.message || "Failed to initiate AI task");
    }
  };

  const handleScorecardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors((prev) => ({ ...prev, scorecard: "" }));

    const parsed = videoIdSchema.safeParse(scorecardVideoIdInput.trim());
    if (!parsed.success) {
      setValidationErrors((prev) => ({ ...prev, scorecard: parsed.error.issues[0]?.message || "Invalid video ID" }));
      return;
    }

    setScorecardStatus("submitting");
    setScorecardErrorMsg("");
    setScorecardResult(null);

    try {
      const json = await customFetch("/api/scorecard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": `idem-scorecard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        },
        body: JSON.stringify({ videoId: parsed.data }),
      });

      if (json.data.state === "completed") {
        setScorecardStatus("completed");
        setScorecardResult(json.data.result);
        refetchCredits(); // Refresh credits
      } else {
        setScorecardStatus("waiting");
        setScorecardPollingJobId(json.data.jobId);
      }
    } catch (err: any) {
      setScorecardStatus("failed");
      setScorecardErrorMsg(err.message || "Failed to initiate video scorecard audit");
    }
  };

  // Format Recharts data safely
  const chartData =
    channelData?.history?.map((video: VideoHistoryItem) => ({
      title: video.title.length > 15 ? video.title.slice(0, 15) + "..." : video.title,
      fullTitle: video.title,
      views: parseInt(video.viewCount, 10) || 0,
      likes: parseInt(video.likeCount, 10) || 0,
      date: new Date(video.publishedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    })).reverse() || [];

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans relative pb-12">
      {/* Top Background Orbs */}
      <div
        className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        {/* Header section with Title & Credits */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-text-primary via-primary to-accent bg-clip-text text-transparent">
              TubeRank Analytics Dashboard
            </h1>
            <p className="text-xs md:text-sm text-text-muted mt-1 font-medium">
              Perform keyword research, track competitors, and view channel analytics details.
            </p>
          </div>

          {/* Credits & Status Badges */}
          <div className="flex items-center gap-3 self-start md:self-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5 shadow-lg backdrop-blur-md">
            {creditsData !== undefined && (
              <span className="text-xs text-text-muted font-semibold flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                Credits: <span className="text-text-primary font-bold">{creditsData.credits}</span>
              </span>
            )}
            <span className="h-3 w-px bg-white/10" />
            <span className="text-xs text-text-muted font-semibold">
              Pro Member
            </span>
          </div>
        </div>

        {creditsData?.redisPaused && (
          <div className="mb-6 relative overflow-hidden rounded-card border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-4 shadow-lg backdrop-blur-md">
            {/* Animated glow light effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/15 rounded-lg border border-amber-500/20 text-amber-400 shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 animate-pulse"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">AI Features Temporarily Paused</h4>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed max-w-3xl">
                  Due to monthly system limits, AI Suite and Video Scorecard generation are temporarily paused. Existing analyses and other dashboard features remain fully functional. Usage limits reset at the start of next month.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal Navigation Tabs */}
        <div className="border-b border-white/10 mb-8 relative pb-px">
          <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar relative">
            {/* Sliding border line animation (Fluid Flow) */}
            <div
              className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hidden md:block"
              style={{
                left: currentView === "analytics" ? "0px" : currentView === "ai-suite" ? "176px" : "336px",
                width: currentView === "analytics" ? "144px" : currentView === "ai-suite" ? "128px" : "128px",
              }}
            />
            
            <button
              onClick={() => setCurrentView("analytics")}
              className={`pb-3 text-sm font-bold transition-all duration-200 focus:outline-none shrink-0 w-36 text-left ${
                currentView === "analytics"
                  ? "text-text-primary border-b-2 border-primary md:border-b-0"
                  : "text-text-muted hover:text-text-primary border-b-2 border-transparent md:border-b-0"
              }`}
            >
              YouTube Analytics
            </button>
            <button
              onClick={() => setCurrentView("ai-suite")}
              className={`pb-3 text-sm font-bold transition-all duration-200 focus:outline-none shrink-0 w-32 text-left ${
                currentView === "ai-suite"
                  ? "text-text-primary border-b-2 border-primary md:border-b-0"
                  : "text-text-muted hover:text-text-primary border-b-2 border-transparent md:border-b-0"
              }`}
            >
              AI Creators Suite
            </button>
            <button
              onClick={() => setCurrentView("scorecard")}
              className={`pb-3 text-sm font-bold transition-all duration-200 focus:outline-none shrink-0 w-32 text-left ${
                currentView === "scorecard"
                  ? "text-text-primary border-b-2 border-primary md:border-b-0"
                  : "text-text-muted hover:text-text-primary border-b-2 border-transparent md:border-b-0"
              }`}
            >
              Video Scorecard
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNERS */}
        {isOffline && (
          <div className="bg-amber-500 text-slate-950 text-xs font-bold py-2.5 px-4 text-center z-25 flex items-center justify-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 4.978 4.978 0 011.414-3.536m0 0l2.829 2.829m-2.829-2.829L3 3m5.464 5.464a9 9 0 013.536-1.414M9 9l2.828 2.828" />
            </svg>
            <span>You are currently offline. Competitor additions will be queued and synced upon reconnection.</span>
          </div>
        )}

        {rateLimitCountdown !== null && (
          <div className="bg-error/20 border-b border-error/30 text-error text-xs font-bold py-2.5 px-4 text-center z-25 flex items-center justify-center gap-2">
            <svg className="h-4 w-4 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Rate limit reached. Auto‑retrying queries in {rateLimitCountdown} seconds...</span>
          </div>
        )}

        {supportId !== null && (
          <div className="bg-error/10 border-b border-error/20 text-error text-xs font-bold py-2.5 px-4 text-center z-25 flex items-center justify-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Internal Server Error occurred. Reference Support ID: <span className="font-mono underline">{supportId}</span>.</span>
            <button onClick={() => setSupportId(null)} className="text-text-muted hover:text-text-primary ml-2 underline text-[10px]">Dismiss</button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="pb-12">
          
          {/* ================= VIEW 1: YOUTUBE ANALYTICS ================= */}
          {currentView === "analytics" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Keyword Research & Competitors */}
              <div className="lg:col-span-1 space-y-8">
                
                {/* Keyword Research Panel */}
                <section
                  className="glass-panel glass-panel-hover rounded-card p-6 shadow-xl"
                >
                  <h2 className="text-lg font-bold mb-4 text-primary tracking-tight">Keyword Research</h2>
                  <form onSubmit={handleKeywordSearch} className="flex flex-col gap-2 mb-6">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        maxLength={60}
                        placeholder="Search keyword suggestion..."
                        className="flex-1 glass-input rounded-button px-4 py-2.5 text-sm placeholder-text-muted transition-all duration-200"
                      />
                      <PrimaryButton
                        type="submit"
                        className="px-5 py-2.5 text-sm"
                      >
                        Search
                      </PrimaryButton>
                    </div>
                    {validationErrors.keyword && (
                      <p className="text-xs text-error mt-1">{validationErrors.keyword}</p>
                    )}
                  </form>

                  {/* Suggestions Table / Loading / Error states */}
                  {isLoadingKeyword ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-8 bg-white/5 rounded w-full"></div>
                      <div className="h-6 bg-white/5 rounded w-2/3"></div>
                      <div className="space-y-2">
                        <div className="h-10 bg-white/5 rounded w-full"></div>
                        <div className="h-10 bg-white/5 rounded w-full"></div>
                      </div>
                    </div>
                  ) : keywordError ? (
                    <div className="bg-error/10 border border-error/20 text-error rounded-card p-4 text-xs font-semibold">
                      Failed to fetch keywords. {(keywordError as any).message || "Ensure credit balance is sufficient."}
                    </div>
                  ) : keywordData ? (
                    <div className="space-y-4">
                      <div className="bg-white/5 border border-white/10 rounded-card p-4">
                        <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                          Keyword Volume
                        </div>
                        <div className="text-2xl font-black text-primary mt-1">
                          {keywordData.volume.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2.5">
                          Suggestions Table
                        </h3>
                        <div className="overflow-x-auto rounded-card border border-white/10">
                          <table className="min-w-full divide-y divide-white/10">
                            <thead className="bg-white/5">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                  Keyword
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                  Volume
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                  Strength
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-transparent">
                              {keywordData.suggestions?.map((item: KeywordSuggestionItem, idx: number) => {
                                const isHigh = item.volume > 50000;
                                const isMed = item.volume > 10000;
                                return (
                                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="px-3 py-2.5 text-xs font-medium text-text-primary truncate max-w-[120px]">
                                      {item.keyword}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs font-bold font-mono text-primary">
                                      {item.volume.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs">
                                      <span
                                        className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                          isHigh
                                            ? "bg-accent/20 text-accent border border-accent/20"
                                            : isMed
                                            ? "bg-primary/20 text-primary border border-primary/20"
                                            : "bg-white/10 text-text-muted"
                                        }`}
                                      >
                                        {isHigh ? "High" : isMed ? "Medium" : "Low"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-8 px-4 text-xs text-text-muted border border-dashed border-white/10 rounded-card leading-relaxed">
                      <svg
                        className="h-8 w-8 text-primary mb-3 opacity-80"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        aria-hidden="true"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-3-3" />
                      </svg>
                      <p className="font-semibold text-text-muted">
                        Search a keyword to see estimated search volumes.
                      </p>
                      <span className="text-[10px] font-extrabold mt-1 block text-primary">(Costs 1 credit)</span>
                    </div>
                  )}
                </section>

                {/* Competitors Tracker Card */}
                <section
                  className="glass-panel glass-panel-hover rounded-card p-6 shadow-xl"
                >
                  <h2 className="text-lg font-bold mb-4 text-accent tracking-tight">Competitors Tracker</h2>
                  <form onSubmit={handleAddCompetitor} className="flex flex-col gap-2 mb-6">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCompetitorId}
                        onChange={(e) => setNewCompetitorId(e.target.value)}
                        maxLength={40}
                        placeholder="Enter YouTube Channel ID..."
                        className="flex-1 glass-input rounded-button px-4 py-2.5 text-sm placeholder-text-muted transition-all duration-200"
                      />
                      <PrimaryButton
                        type="submit"
                        disabled={addCompMutation.isPending}
                        className="px-5 py-2.5 text-sm"
                      >
                        Track
                      </PrimaryButton>
                    </div>
                    {validationErrors.competitor && (
                      <p className="text-xs text-error mt-1">{validationErrors.competitor}</p>
                    )}
                  </form>

                  {/* Competitors List */}
                  {isLoadingComp ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-12 bg-white/5 rounded"></div>
                      <div className="h-12 bg-white/5 rounded"></div>
                    </div>
                  ) : (competitors && competitors.length > 0) || addCompMutation.isPending ? (
                    <ul className="space-y-3">
                      {competitors?.map((comp: CompetitorItem) => (
                        <li
                          key={comp.id}
                          className={`flex justify-between items-center bg-white/5 border border-white/10 hover:border-accent/30 rounded-card px-4 py-3 text-sm transition-colors ${
                            comp.id.toString().startsWith("temp-") ? "animate-pulse opacity-60 pointer-events-none select-none" : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="font-semibold text-text-primary truncate">{comp.name}</div>
                            <div className="text-[10px] text-text-muted font-mono truncate mt-0.5">{comp.youtubeId}</div>
                          </div>
                          <button
                            onClick={() => removeCompMutation.mutate(comp.id)}
                            disabled={removeCompMutation.isPending || comp.id.toString().startsWith("temp-")}
                            className="text-error hover:text-error/85 text-xs font-bold px-2 py-1 transition-colors focus:outline-none focus:underline"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-8 px-4 text-xs text-text-muted border border-dashed border-white/10 rounded-card">
                      <svg
                        className="h-8 w-8 text-accent mb-3 opacity-80"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <p className="font-semibold text-text-muted">
                        No competitors tracked yet. Add a Channel ID above.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* Right Column: Channel Statistics Card */}
              <div className="lg:col-span-2 space-y-8">
                
                <section
                  className="glass-panel rounded-card p-6 shadow-xl"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-lg font-bold text-primary tracking-tight">Channel Statistics & Performance</h2>
                    <form onSubmit={handleChannelSearch} className="flex flex-col gap-1 w-full md:w-auto">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={channelInput}
                          onChange={(e) => setChannelInput(e.target.value)}
                          maxLength={40}
                          placeholder="YouTube Channel ID..."
                          className="glass-input rounded-button px-4 py-2 text-xs placeholder-text-muted w-full md:w-56 transition-all duration-200"
                        />
                        <PrimaryButton
                          type="submit"
                          className="px-4 py-2 text-xs shrink-0"
                        >
                          Analyze
                        </PrimaryButton>
                      </div>
                      {validationErrors.channel && (
                        <p className="text-[10px] text-error mt-0.5">{validationErrors.channel}</p>
                      )}
                    </form>
                  </div>

                  {/* Channel Data Display */}
                  {isLoadingChannel ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="h-24 bg-white/5 rounded-card animate-pulse"></div>
                        <div className="h-24 bg-white/5 rounded-card animate-pulse"></div>
                        <div className="h-24 bg-white/5 rounded-card animate-pulse"></div>
                      </div>
                      <div className="h-64 bg-white/5 rounded-card animate-pulse"></div>
                    </div>
                  ) : channelError ? (
                    <div className="bg-error/10 border border-error/20 text-error rounded-card p-4 text-xs font-semibold">
                      Failed to fetch channel analytics. {(channelError as any).message || "Please check channel ID."}
                    </div>
                  ) : channelData ? (
                    <div className="space-y-6">
                      
                      {/* Banner */}
                      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-card p-4">
                        <ChannelAvatar
                          src={channelData.channel.thumbnailUrl}
                          title={channelData.channel.title}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-text-primary text-base truncate">{channelData.channel.title}</h3>
                          <p className="text-xs text-text-muted truncate mt-0.5">{channelData.channel.description}</p>
                        </div>
                      </div>

                      {/* Info counts */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass-panel rounded-card p-5 text-center shadow-lg hover:scale-[1.03] hover:border-primary/30 transition-all duration-300">
                          <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Subscribers</div>
                          <div className="text-2xl font-black text-primary mt-1">
                            {animatedSubscribers.toLocaleString()}
                          </div>
                        </div>
                        <div className="glass-panel rounded-card p-5 text-center shadow-lg hover:scale-[1.03] hover:border-accent/30 transition-all duration-300">
                          <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Total Views</div>
                          <div className="text-2xl font-black text-accent mt-1">
                            {animatedViews.toLocaleString()}
                          </div>
                        </div>
                        <div className="glass-panel rounded-card p-5 text-center shadow-lg hover:scale-[1.03] hover:border-white/20 transition-all duration-300">
                          <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Total Uploads</div>
                          <div className="text-2xl font-black text-text-primary mt-1">
                            {animatedUploads.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Recharts Composed Chart */}
                      <div className="glass-panel rounded-card p-6 shadow-xl">
                        <h4 className="text-xs font-bold text-text-muted mb-4 uppercase tracking-wider">
                          Recent Videos performance
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              key={activeChannelId}
                              data={chartData}
                              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="title" stroke="#64748b" fontSize={9} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="views"
                                name="Views"
                                stroke="#8B5CF6"
                                strokeWidth={2.5}
                                fill="url(#colorViews)"
                                isAnimationActive={true}
                                animationDuration={800}
                                animationEasing="ease-out"
                              />
                              <Line
                                type="monotone"
                                dataKey="likes"
                                name="Likes"
                                stroke="#10B981"
                                strokeWidth={2.5}
                                dot={{ fill: "#10B981", r: 3 }}
                                activeDot={{ r: 5 }}
                                isAnimationActive={true}
                                animationDuration={800}
                                animationEasing="ease-out"
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Video History list */}
                      <div>
                        <h4 className="text-xs font-bold text-text-muted mb-3 uppercase tracking-wider">
                          Upload History
                        </h4>
                        <div className="bg-white/5 border border-white/10 rounded-card divide-y divide-white/5 overflow-hidden">
                          {channelData.history?.slice(0, 5).map((video: VideoHistoryItem) => (
                            <div key={video.id} className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                              <div className="min-w-0 pr-4">
                                <div className="font-semibold text-text-primary text-sm truncate">{video.title}</div>
                                <div className="text-[10px] text-text-muted mt-1">
                                  Published: {new Date(video.publishedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex gap-4 text-right shrink-0">
                                <div>
                                  <div className="text-[9px] text-text-muted uppercase tracking-wider">Views</div>
                                  <div className="text-xs font-bold text-text-primary">
                                    {parseInt(video.viewCount, 10).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-text-muted uppercase tracking-wider">Likes</div>
                                  <div className="text-xs font-bold text-text-primary">
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
                    <div className="text-center py-12 text-xs text-text-muted border border-dashed border-white/10 rounded-card">
                      Input a YouTube Channel ID above to view stats.
                    </div>
                  )}
                </section>
              </div>

            </div>
          )}

          {/* ================= VIEW 2: AI CREATORS SUITE ================= */}
          {currentView === "ai-suite" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { id: "title-generator", name: "Title Gen", cost: 2, activeClass: "border-primary/40 bg-primary/10 shadow-[0_0_15px_rgba(139,92,246,0.15)] text-primary ring-1 ring-primary/20", hoverClass: "hover:border-primary/30 hover:bg-primary/5 text-text-muted hover:text-text-primary" },
                  { id: "description-writer", name: "Desc Writer", cost: 3, activeClass: "border-accent/40 bg-accent/10 shadow-[0_0_15px_rgba(244,63,94,0.15)] text-accent ring-1 ring-accent/20", hoverClass: "hover:border-accent/30 hover:bg-accent/5 text-text-muted hover:text-text-primary" },
                  { id: "thumbnail-concepts", name: "Thumbnail", cost: 2, activeClass: "border-amber-500/40 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-400 ring-1 ring-amber-500/20", hoverClass: "hover:border-amber-500/30 hover:bg-amber-500/5 text-text-muted hover:text-text-primary" },
                  { id: "content-outline", name: "Outline", cost: 5, activeClass: "border-fuchsia-500/40 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(217,70,239,0.15)] text-fuchsia-400 ring-1 ring-fuchsia-500/20", hoverClass: "hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5 text-text-muted hover:text-text-primary" },
                  { id: "seo-audit", name: "SEO Audit", cost: 3, activeClass: "border-pink-500/40 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.15)] text-pink-400 ring-1 ring-pink-500/20", hoverClass: "hover:border-pink-500/30 hover:bg-pink-500/5 text-text-muted hover:text-text-primary" },
                ].map((t) => {
                  const isActive = selectedTool === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTool(t.id as any);
                        setAiStatus("idle");
                        setAiResult(null);
                        setAiErrorMsg("");
                        setValidationErrors({});
                      }}
                      className={`border rounded-card p-3.5 text-center transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-95 focus:outline-none ${
                        isActive
                          ? `${t.activeClass} scale-[1.03]`
                          : `bg-white/5 border-white/5 ${t.hoverClass}`
                      }`}
                    >
                      <div className="font-bold text-xs uppercase tracking-wider">{t.name}</div>
                      <div className="text-[10px] opacity-80 mt-1">{t.cost} Credits</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Form Settings */}
                <div
                  className="lg:col-span-1 glass-panel rounded-card p-6 shadow-2xl h-fit"
                >
                  <h3 className="text-base font-bold mb-4 capitalize text-primary border-b border-white/5 pb-2.5">
                    {selectedTool.replace("-", " ")} Settings
                  </h3>

                  <form onSubmit={handleAISubmit} className="space-y-4">
                    {validationErrors.aiSuite && (
                      <div className="bg-error/10 border border-error/20 text-error text-xs font-semibold rounded-button p-3 animate-shake">
                        {validationErrors.aiSuite}
                      </div>
                    )}

                    {selectedTool === "title-generator" && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Video Topic</label>
                          <input
                            type="text"
                            required
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            maxLength={100}
                            placeholder="e.g. Building a SaaS in 24 hours"
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Keywords</label>
                          <input
                            type="text"
                            value={aiKeywords}
                            onChange={(e) => setAiKeywords(e.target.value)}
                            maxLength={100}
                            placeholder="e.g. saas, nextjs, nextauth"
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                      </>
                    )}

                    {selectedTool === "description-writer" && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Video Title</label>
                          <input
                            type="text"
                            required
                            value={aiTitle}
                            onChange={(e) => setAiTitle(e.target.value)}
                            maxLength={100}
                            placeholder="e.g. How I Built a SaaS in 24 Hours"
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Topics Covered</label>
                          <textarea
                            required
                            rows={3}
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            maxLength={100}
                            placeholder="e.g. Planning database, configuring stripe hooks, deploying to vercel..."
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                      </>
                    )}

                    {selectedTool === "thumbnail-concepts" && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Video Title</label>
                          <input
                            type="text"
                            required
                            value={aiTitle}
                            onChange={(e) => setAiTitle(e.target.value)}
                            maxLength={100}
                            placeholder="e.g. 10 YouTube Hacks To Grow Fast"
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Description summary</label>
                          <textarea
                            required
                            rows={3}
                            value={aiDescription}
                            onChange={(e) => setAiDescription(e.target.value)}
                            maxLength={500}
                            placeholder="e.g. The video goes over algorithm secrets and click rate hooks..."
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                      </>
                    )}

                    {selectedTool === "content-outline" && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Video Topic</label>
                          <input
                            type="text"
                            required
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            maxLength={100}
                            placeholder="e.g. Introduction to TypeScript Generics"
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Duration</label>
                          <input
                            type="text"
                            value={aiDuration}
                            onChange={(e) => setAiDuration(e.target.value)}
                            maxLength={30}
                            placeholder="e.g. 10 minutes"
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                      </>
                    )}

                    {selectedTool === "seo-audit" && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Video Title</label>
                          <input
                            type="text"
                            required
                            value={aiTitle}
                            onChange={(e) => setAiTitle(e.target.value)}
                            maxLength={100}
                            placeholder="e.g. Learn NextJS in 10 minutes"
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Video Description</label>
                          <textarea
                            required
                            rows={3}
                            value={aiDescription}
                            onChange={(e) => setAiDescription(e.target.value)}
                            maxLength={500}
                            placeholder="e.g. In this tutorial we go over NextJS app router..."
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Tags</label>
                          <input
                            type="text"
                            value={aiTags}
                            onChange={(e) => setAiTags(e.target.value)}
                            maxLength={200}
                            placeholder="e.g. nextjs, react, coding"
                            className="w-full glass-input rounded-button px-4 py-2.5 text-sm transition-all duration-200"
                          />
                        </div>
                      </>
                    )}

                    <PrimaryButton
                      type="submit"
                      disabled={aiStatus === "submitting" || aiStatus === "waiting" || aiStatus === "active"}
                      className="w-full py-2.5 text-sm mt-2"
                    >
                      {aiStatus === "submitting"
                        ? "Submitting Job..."
                        : aiStatus === "waiting" || aiStatus === "active"
                        ? "Queue Active (Polling)..."
                        : "Generate with AI"}
                    </PrimaryButton>
                  </form>
                </div>

                {/* Preview/Result Column */}
                <div
                  className="lg:col-span-2 glass-panel rounded-card p-6 shadow-2xl min-h-[350px] flex flex-col"
                >
                  <h3 className="text-base font-bold mb-4 text-primary border-b border-white/5 pb-2.5">
                    AI Output Result
                  </h3>

                  {(aiStatus === "submitting" || aiStatus === "waiting" || aiStatus === "active") && (
                    <div className="space-y-6 flex-1 justify-center flex flex-col py-6">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 bg-primary rounded-full animate-ping shrink-0"></div>
                        <div className="text-xs text-text-primary font-bold uppercase tracking-wider">
                          Status: {aiStatus === "submitting" ? "Submitting request..." : `Job processing in queue (${aiStatus})...`}
                        </div>
                      </div>
                      <div className="space-y-4 animate-pulse">
                        <div className="h-6 bg-white/5 rounded w-1/3"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-white/5 rounded w-full"></div>
                          <div className="h-4 bg-white/5 rounded w-full"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {aiStatus === "failed" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-error py-12 text-center">
                      <p className="font-bold text-sm">AI Task Failed</p>
                      <p className="text-xs mt-1 text-text-muted max-w-md">{aiErrorMsg}</p>
                      <p className="text-[10px] text-text-muted mt-4">Your credit balance has been fully refunded.</p>
                    </div>
                  )}

                  {aiStatus === "idle" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-muted py-12 text-center">
                      <p className="text-xs">Configure settings on the left and click Generate.</p>
                      <p className="text-[10px] mt-1">Deducted credits will be fully refunded if the task fails.</p>
                    </div>
                  )}

                  {aiStatus === "completed" && aiResult && (
                    <div className="flex-1 space-y-6">
                      {selectedTool === "title-generator" && aiResult.titles && (
                        <div className="space-y-4">
                          {aiResult.titles.map((t: any, i: number) => (
                            <div
                              key={i}
                              className="bg-white/5 border border-white/10 rounded-card p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary/30 transition-all"
                            >
                              <div className="space-y-1 flex-1 min-w-0">
                                <h4 className="font-bold text-text-primary text-sm">"{t.title}"</h4>
                                <p className="text-xs text-text-muted">{t.rationale}</p>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(t.title);
                                  alert("Title copied!");
                                }}
                                className="text-xs font-semibold bg-white/5 border border-white/10 text-primary hover:text-primary/80 rounded-button px-3 py-1.5 transition-colors shrink-0"
                              >
                                Copy
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedTool === "description-writer" && (
                        <div className="space-y-4 bg-white/5 border border-white/10 rounded-card p-6">
                          <div>
                            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Introduction Summary</h4>
                            <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{aiResult.introduction}</p>
                          </div>
                          
                          {aiResult.chapters && aiResult.chapters.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Chapters & Timestamps</h4>
                              <div className="divide-y divide-white/5 border border-white/10 rounded-card overflow-hidden">
                                {aiResult.chapters.map((ch: any, i: number) => (
                                  <div key={i} className="flex gap-4 p-3 text-xs hover:bg-white/[0.02]">
                                    <span className="font-mono text-primary font-bold">{ch.timestamp}</span>
                                    <span className="text-text-primary">{ch.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Call To Action</h4>
                            <p className="text-xs text-text-primary leading-relaxed italic">{aiResult.callToAction}</p>
                          </div>

                          {aiResult.tags && aiResult.tags.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Tags</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {aiResult.tags.map((tag: string, i: number) => (
                                  <span key={i} className="text-xs bg-white/5 border border-white/10 text-text-muted rounded-full px-2.5 py-1">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedTool === "thumbnail-concepts" && aiResult.concepts && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {aiResult.concepts.map((c: any, i: number) => (
                            <div
                              key={i}
                              className="bg-white/5 border border-white/10 rounded-card p-4 flex flex-col justify-between hover:border-primary/30 transition-all text-left"
                            >
                              <div className="space-y-3">
                                <div className="bg-white/5 border border-white/10 rounded-button px-3 py-2 text-center font-black text-primary tracking-wide text-xs">
                                  "{c.textOverlay.toUpperCase()}"
                                </div>
                                <p className="text-xs text-text-primary leading-relaxed">{c.description}</p>
                                
                                <div>
                                  <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Visual Elements</div>
                                  <ul className="text-xs text-text-muted space-y-1 list-disc pl-3.5">
                                    {c.visualElements?.map((el: string, idx: number) => (
                                      <li key={idx}>{el}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-white/5">
                                <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Palette</div>
                                <div className="flex gap-1 flex-wrap">
                                  {c.colorPalette?.map((color: string, idx: number) => (
                                    <span key={idx} className="text-[9px] bg-white/5 border border-white/10 text-primary rounded px-1.5 py-0.5 whitespace-nowrap">
                                      {color}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedTool === "content-outline" && (
                        <div className="space-y-4">
                          {aiResult.sections && aiResult.sections.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Video Structure</h4>
                              <div className="space-y-3">
                                {aiResult.sections.map((sec: any, i: number) => (
                                  <div key={i} className="bg-white/5 border border-white/10 rounded-card p-4 hover:border-primary/30 transition-all text-left">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2.5">
                                      <span className="font-bold text-primary text-xs">{sec.name}</span>
                                      <span className="text-xs bg-white/5 text-text-muted px-2 py-0.5 rounded font-mono">{sec.durationEstimated}</span>
                                    </div>
                                    <ul className="text-xs text-text-muted space-y-1.5 list-disc pl-4">
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
                            <div className="bg-primary/5 border border-primary/10 rounded-card p-4 text-left">
                              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Key Takeaways</h4>
                              <div className="text-xs text-text-muted space-y-1.5">
                                {aiResult.keyTakeaways.map((kt: string, i: number) => (
                                  <span key={i} className="block text-text-muted">💡 {kt}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedTool === "seo-audit" && (
                        <div className="space-y-4">
                          <div className="bg-white/5 border border-white/10 rounded-card p-4 flex items-center justify-between">
                            <div>
                              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">SEO Score</h4>
                              <p className="text-xs text-text-muted">Metadata completeness rating</p>
                            </div>
                            <div className={`text-2xl font-black rounded-button px-4 py-2 border ${
                              aiResult.score >= 80 ? "text-accent border-accent/20 bg-accent/10" :
                              aiResult.score >= 50 ? "text-amber-400 border-amber-400/20 bg-amber-400/10" :
                              "text-error border-error/20 bg-error/10"
                            }`}>
                              {aiResult.score}/100
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="bg-white/5 border border-white/10 rounded-card p-4">
                              <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2.5">Strengths</h4>
                              <ul className="text-xs text-text-muted space-y-1.5">
                                {aiResult.strengths?.map((str: string, i: number) => (
                                  <li key={i} className="flex gap-2 items-start">
                                    <span className="text-accent font-bold">✓</span>
                                    <span>{str}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-card p-4">
                              <h4 className="text-[10px] font-bold text-error uppercase tracking-wider mb-2.5">Improvements</h4>
                              <ul className="text-xs text-text-muted space-y-1.5">
                                {aiResult.weaknesses?.map((weak: string, i: number) => (
                                  <li key={i} className="flex gap-2 items-start">
                                    <span className="text-error font-bold">⚠</span>
                                    <span>{weak}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="bg-white/5 border border-white/10 rounded-card p-4 text-left">
                            <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Recommendations</h4>
                            <ul className="text-xs text-text-muted space-y-1.5">
                              {aiResult.recommendations?.map((rec: string, i: number) => (
                                <li key={i} className="flex gap-2 items-start">
                                  <span className="text-primary font-bold">→</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

          {/* ================= VIEW 3: VIDEO SCORECARD ================= */}
          {currentView === "scorecard" && (
            <div className="space-y-6">
              
              <div
                className="glass-panel rounded-card p-6 shadow-xl"
              >
                <h2 className="text-lg font-bold mb-2 text-primary tracking-tight">Audit Video Scorecard</h2>
                <p className="text-xs text-text-muted mb-6">
                  Input a YouTube Video ID to run a deep metadata audit across title, description, tags, and thumbnail concepts. (Costs 3 credits)
                </p>

                <form onSubmit={handleScorecardSubmit} className="flex flex-col gap-2">
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      required
                      value={scorecardVideoIdInput}
                      onChange={(e) => setScorecardVideoIdInput(e.target.value)}
                      maxLength={25}
                      placeholder="Enter YouTube Video ID (e.g. dQw4w9WgXcQ)..."
                      className="flex-1 glass-input rounded-button px-4 py-2.5 text-sm placeholder-text-muted transition-all duration-200"
                    />
                    <PrimaryButton
                      type="submit"
                      disabled={scorecardStatus === "submitting" || scorecardStatus === "waiting" || scorecardStatus === "active"}
                      className="py-2.5 px-6 text-sm shrink-0"
                    >
                      {scorecardStatus === "submitting"
                        ? "Enqueuing..."
                        : scorecardStatus === "waiting" || scorecardStatus === "active"
                        ? "Auditing..."
                        : "Audit Scorecard"}
                    </PrimaryButton>
                  </div>
                  {validationErrors.scorecard && (
                    <p className="text-xs text-error mt-1">{validationErrors.scorecard}</p>
                  )}
                </form>
              </div>

              {/* Status Skeletons */}
              {(scorecardStatus === "submitting" || scorecardStatus === "waiting" || scorecardStatus === "active") && (
                <div
                  className="bg-card rounded-card p-6 shadow-xl space-y-6"
                  style={{ border: "var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 bg-primary rounded-full animate-ping"></div>
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Status: {scorecardStatus === "submitting" ? "Submitting request..." : `Job processing in queue (${scorecardStatus})...`}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 flex flex-col items-center justify-center py-4">
                      <div className="w-36 h-36 rounded-full border-4 border-dashed border-white/5 animate-pulse bg-white/[0.02]"></div>
                      <div className="h-5 bg-white/5 rounded w-16 mt-4 animate-pulse"></div>
                    </div>
                    <div className="md:col-span-2 space-y-4 py-4">
                      <div className="h-8 bg-white/5 rounded w-1/3 animate-pulse"></div>
                      <div className="space-y-3">
                        <div className="h-6 bg-white/5 rounded w-full animate-pulse"></div>
                        <div className="h-6 bg-white/5 rounded w-full animate-pulse"></div>
                        <div className="h-6 bg-white/5 rounded w-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {scorecardStatus === "failed" && (
                <div
                  className="bg-card rounded-card p-8 shadow-xl text-center"
                  style={{ border: "var(--border)" }}
                >
                  <div className="text-error mb-2 text-xl font-bold">Audit Failed</div>
                  <p className="text-xs text-text-muted max-w-md mx-auto">{scorecardErrorMsg}</p>
                  <p className="text-[10px] text-text-muted mt-4">Your credit balance has been fully refunded.</p>
                </div>
              )}

              {/* Idle state */}
              {scorecardStatus === "idle" && !scorecardResult && (
                <div className="text-center py-12 text-xs text-text-muted border border-dashed border-white/10 rounded-card">
                  Run a scorecard audit above to see a detailed SEO analysis and scoring grades.
                </div>
              )}

              {/* Completed state */}
              {scorecardStatus === "completed" && scorecardResult && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  <div className="lg:col-span-1 space-y-8">
                    <div
                      className="bg-card rounded-card p-6 shadow-xl flex flex-col items-center text-center"
                      style={{ border: "var(--border)" }}
                    >
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-6">
                        Optimization Rating
                      </h3>

                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="transparent"
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeWidth="10"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="transparent"
                            stroke={
                              scorecardResult.overallScore >= 80
                                ? "#10B981"
                                : scorecardResult.overallScore >= 50
                                ? "#F59E0B"
                                : "#EF4444"
                            }
                            strokeWidth="10"
                            strokeDasharray={314.16}
                            strokeDashoffset={314.16 - (scorecardResult.overallScore / 100) * 314.16}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-text-primary">
                            {scorecardResult.overallScore}
                          </span>
                          <span className="text-[10px] text-text-muted font-bold mt-0.5">/100</span>
                        </div>
                      </div>

                      <div className="mt-6 text-sm font-semibold text-text-primary">
                        {scorecardResult.overallScore >= 80 ? (
                          <span className="text-accent">Highly Optimized</span>
                        ) : scorecardResult.overallScore >= 50 ? (
                          <span className="text-amber-400">Needs Adjustments</span>
                        ) : (
                          <span className="text-error">Poor SEO Score</span>
                        )}
                      </div>
                    </div>

                    <div
                      className="bg-card rounded-card p-6 shadow-xl space-y-4"
                      style={{ border: "var(--border)" }}
                    >
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                        Subscore breakdown
                      </h3>

                      {[
                        { name: "Title Optimization", val: scorecardResult.subscores?.title || 0, wt: "30%" },
                        { name: "Description Relevance", val: scorecardResult.subscores?.description || 0, wt: "25%" },
                        { name: "Tags Alignment", val: scorecardResult.subscores?.tags || 0, wt: "25%" },
                        { name: "Thumbnail Concept", val: scorecardResult.subscores?.thumbnail || 0, wt: "20%" },
                      ].map((sub, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-text-primary">{sub.name} <span className="text-text-muted text-[10px]">({sub.wt})</span></span>
                            <span className="text-primary font-bold">{sub.val}/100</span>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${sub.val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-8">
                    
                    {scorecardResult.videoMetadata && (
                      <div
                        className="bg-card rounded-card p-6 shadow-xl"
                        style={{ border: "var(--border)" }}
                      >
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                          Video Details
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4">
                          {scorecardResult.videoMetadata.thumbnails?.high?.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={scorecardResult.videoMetadata.thumbnails.high.url}
                              alt="Thumbnail preview"
                              className="w-full md:w-40 h-24 object-cover rounded-button border border-white/10"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-text-primary text-base leading-snug line-clamp-2">
                              {scorecardResult.videoMetadata.title}
                            </h4>
                            <p className="text-xs text-text-muted font-mono mt-1">ID: {scorecardResult.videoId}</p>
                            
                            <div className="flex gap-4 mt-3">
                              <div>
                                <span className="text-[9px] text-text-muted uppercase tracking-wider block">Views</span>
                                <span className="text-xs font-bold text-text-primary">
                                  {parseInt(scorecardResult.videoMetadata.statistics?.viewCount || "0", 10).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-text-muted uppercase tracking-wider block">Likes</span>
                                <span className="text-xs font-bold text-text-primary">
                                  {parseInt(scorecardResult.videoMetadata.statistics?.likeCount || "0", 10).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div
                        className="bg-card rounded-card p-6 shadow-xl"
                        style={{ border: "var(--border)" }}
                      >
                        <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
                          Strengths
                        </h3>
                        <ul className="space-y-2 text-xs text-text-muted">
                          {scorecardResult.strengths?.map((str: string, i: number) => (
                            <li key={i} className="flex gap-2 items-start">
                              <span className="text-accent font-bold">✓</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div
                        className="bg-card rounded-card p-6 shadow-xl"
                        style={{ border: "var(--border)" }}
                      >
                        <h3 className="text-xs font-bold text-error uppercase tracking-wider mb-3">
                          Weaknesses
                        </h3>
                        <ul className="space-y-2 text-xs text-text-muted">
                          {scorecardResult.weaknesses?.map((weak: string, i: number) => (
                            <li key={i} className="flex gap-2 items-start">
                              <span className="text-error font-bold">⚠</span>
                              <span>{weak}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div
                      className="bg-card rounded-card p-6 shadow-xl"
                      style={{ border: "var(--border)" }}
                    >
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                        Actionable Recommendations
                      </h3>
                      <ul className="space-y-3 text-xs text-text-muted">
                        {scorecardResult.recommendations?.map((rec: string, i: number) => (
                          <li key={i} className="flex gap-2.5 items-start">
                            <span className="text-primary font-extrabold">→</span>
                            <span className="leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* ================= 402 QUOTA EXCEEDED UPGRADE MODAL ================= */}
      {isQuotaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsQuotaModalOpen(false)}
            className="absolute inset-0 bg-[#0A0A0C]/80 backdrop-blur-sm"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="quota-modal-title"
            aria-describedby="quota-modal-desc"
            className="relative w-full max-w-sm rounded-modal bg-[#111115] p-6 shadow-2xl border border-white/10 text-center z-10"
          >
            <div className="flex justify-center mb-4 text-[#8B5CF6]">
              <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center animate-pulse">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <h2 id="quota-modal-title" className="text-lg font-bold text-text-primary">
              Quota Exceeded
            </h2>
            <p id="quota-modal-desc" className="mt-2 text-xs text-text-muted leading-relaxed">
              You have exhausted your credit balance. Upgrade your subscription plan to continue utilizing premium audit tools.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsQuotaModalOpen(false)}
                className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-text-primary text-xs font-semibold rounded-button transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsQuotaModalOpen(false);
                  window.location.href = "/dashboard/billing"; // Redirect to billing portal
                }}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-button transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#111115]"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-6 right-6 z-[60] flex max-w-sm w-full items-start gap-3 rounded-[12px] bg-[#111115]/95 backdrop-blur-md p-4 shadow-2xl border transition-all duration-300 ease-out transform ${
          toast.show
            ? "translate-x-0 opacity-100"
            : "translate-x-12 opacity-0 pointer-events-none"
        } ${
          toast.type === "error" ? "border-error/40" : "border-primary/40"
        }`}
      >
        <div className={toast.type === "error" ? "text-error mt-0.5" : "text-primary mt-0.5"}>
          {toast.type === "error" ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-semibold text-text-primary">
            {toast.type === "error" ? "Error" : "Success"}
          </h3>
          <p className="mt-1 text-xs text-text-muted">{toast.message}</p>
        </div>
        <button
          onClick={() => setToast((prev) => ({ ...prev, show: false }))}
          className="text-[#9CA3AF] hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300 rounded"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

    </div>
  );
}
