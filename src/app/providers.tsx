"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import posthog from "posthog-js";
import { env } from "../lib/env";

// Initialize PostHog on client-side
if (typeof window !== "undefined" && env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: false,
    capture_heatmaps: false,
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
    },
  });
}

function SessionTracker() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const hasTracked = sessionStorage.getItem("posthog_signed_in_tracked");
      if (!hasTracked) {
        posthog.identify(session.user.id || session.user.email || undefined);
        posthog.capture("user_signed_in", {
          userId: session.user.id,
          email: session.user.email,
          name: session.user.name,
        });
        sessionStorage.setItem("posthog_signed_in_tracked", "true");
      }
    }
  }, [status, session]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes stale time
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SessionTracker />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
