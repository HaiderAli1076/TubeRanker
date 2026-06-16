# TubeRank Frontend Snapshot

Generated: 2026-06-14

---

## 1. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| **Framework** | Next.js 14.2.3 (App Router) | React 18, TypeScript 5 |
| **Styling** | Tailwind CSS 3.4.1 | Utility-first; PostCSS pipeline. No CSS Modules, no styled-components. |
| **UI component library** | None | No shadcn/ui, Radix, MUI, Chakra, etc. All UI is inline JSX in page files. |
| **State management** | TanStack React Query v5 | Server/async state (competitors, keywords, channel analytics, AI job polling). Local UI state via `useState`/`useEffect`. NextAuth `SessionProvider` for auth session. PostHog for analytics. No Redux, Zustand, or Jotai. |
| **Charts** | Recharts 3.8.1 | Used in dashboard channel analytics |
| **Fonts** | Google Inter via `next/font/google` | Applied on `<body>` in root layout |
| **Browser extension UI** | Vanilla HTML/CSS/JS | Separate `extension/` folder (popup + content script overlay) |

**Architecture note:** There is no `src/components/` directory. The primary web UI lives in monolithic page components under `src/app/`.

---

## 2. Directory Structure

### `src/components/` (2 levels)

```
(does not exist)
```

No shared React components folder is present in this project.

### `src/app/` (2 levels)

```
src/app/
├── api/
│   ├── ai/
│   │   ├── content-outline/
│   │   ├── description-writer/
│   │   ├── seo-audit/
│   │   ├── thumbnail-concepts/
│   │   └── title-generator/
│   ├── auth/
│   │   └── [...nextauth]/
│   ├── channels/
│   │   └── [id]/
│   ├── competitors/
│   │   ├── gap/
│   │   └── route.ts
│   ├── extension/
│   │   └── token/
│   ├── gdpr/
│   │   ├── delete/
│   │   └── export/
│   ├── jobs/
│   │   └── [id]/
│   ├── keywords/
│   │   ├── history/
│   │   └── search/
│   ├── scorecard/
│   │   └── route.ts
│   └── webhooks/
│       └── stripe/
├── csrf-demo/
│   └── page.tsx
├── dashboard/
│   └── page.tsx
├── login/
│   └── page.tsx
├── error.tsx
├── favicon.ico
├── globals.css
├── layout.tsx
├── not-found.tsx
├── page.tsx
└── providers.tsx
```

### `extension/` (related frontend)

```
extension/
├── background.js
├── content.js
├── manifest.json
├── popup.html
└── popup.js
```

---

## 3. Theme / Design Tokens

### `tailwind.config.ts` (full)

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
```

**Observation:** Tailwind config does **not** define custom colors, fonts, spacing, radius, or shadows. No `darkMode` strategy is configured (defaults to `media`).

### `src/app/globals.css` (full)

```css
@import "../styles/tokens.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  color: var(--text-primary);
  background: var(--background);
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

@keyframes meshDrift {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

@keyframes spinnerRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-orb-1 {
  animation: meshDrift 20s ease-in-out infinite alternate;
}

.animate-orb-2 {
  animation: meshDrift 24s ease-in-out infinite alternate-reverse;
}

.animate-spinner {
  animation: spinnerRotate 1s linear infinite;
}

/* Onboarding transitions */
.step-enter {
  opacity: 0;
  transform: translateY(8px);
  animation: stepIn 250ms ease-out forwards;
}

.step-exit {
  opacity: 1;
  transform: translateY(0px);
  animation: stepOut 200ms ease-in forwards;
}

@keyframes stepIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0px);
  }
}

@keyframes stepOut {
  from {
    opacity: 1;
    transform: translateY(0px);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

### Missing token file

`globals.css` imports `../styles/tokens.css`, but **`src/styles/tokens.css` does not exist** in the repository. The login page references semantic token classes (`bg-background`, `bg-card`, `text-text-primary`, `text-text-muted`, `text-primary`, `text-error`, `rounded-card`, `rounded-button`, `focus:ring-primary`, `focus:ring-offset-background`) that are **not defined** in `tailwind.config.ts` and would normally come from that missing CSS file.

### De facto color palette (inline Tailwind usage)

**Dashboard (dark-only, hardcoded):**
- Background: `bg-slate-950`, panels `bg-slate-900`, nested `bg-slate-950`
- Borders: `border-slate-800`, hover accents `border-indigo-500/30`, `border-purple-500/30`, etc.
- Text: `text-slate-100`, `text-slate-400`, `text-slate-500`
- Accents: `indigo-400/500/600`, `purple-400/600`, `blue-400/600`, `emerald-400`, `amber-400`, `pink-400`

**Login page (token-based, intended):**
- CSS variables: `--background`, `--text-primary`, `--error`, `--border`
- Hardcoded fallbacks: `#111115`, gradients `#8B5CF6` → `#6366F1`, `#10B981` → `#3B82F6`

**Extension popup (`extension/popup.html`):**
- Background: `#0f172a` (slate-900)
- Text: `#f8fafc`, muted `#94a3b8`
- Inputs: `#020617` bg, `#334155` border
- Primary gradient: `#8B5CF6` → `#6366F1`
- Error banner: `rgba(239, 68, 68, 0.15)` bg

### Spacing / radius / shadow (conventions, not centralized)

| Token | Usage |
|-------|-------|
| **Radius** | `rounded-lg`, `rounded-xl`, `rounded-card` (undefined), `rounded-button` (undefined), `rounded-full` |
| **Shadow** | `shadow-xl`, `shadow-2xl`, `shadow-sm`; extension uses `box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2)` |
| **Spacing** | Standard Tailwind scale (`p-4`, `p-6`, `gap-4`, `gap-8`, etc.) |

---

## 4. Main Interface Components (Primary AI Interaction UI)

**Important:** This project does **not** implement a conversational chat UI (no message bubbles, no chat thread, no streaming text renderer). AI interaction is **form-based** with async job polling. Below maps the closest equivalents.

### Web app — `src/app/dashboard/page.tsx` (AI Creators Suite tab)

| UI role | Implementation | File path |
|---------|----------------|-----------|
| **Main AI workspace** | `DashboardPage` — tab switcher + AI Suite layout | `src/app/dashboard/page.tsx` |
| **Tool selector sidebar** | 5-button grid (Title Gen, Desc Writer, Thumbnail, Outline, SEO Audit) | `src/app/dashboard/page.tsx` (lines ~657–683) |
| **Input form / prompt area** | Dynamic `<form>` with tool-specific `<input>` / `<textarea>` fields + submit button | `src/app/dashboard/page.tsx` (lines ~689–854) |
| **Output / result panel** (not message bubbles) | `AI Output Result` column with tool-specific result cards | `src/app/dashboard/page.tsx` (lines ~857–1114) |
| **Idle state** | Centered placeholder text | `src/app/dashboard/page.tsx` (lines ~864–868) |
| **Loading / polling indicator** | `animate-ping` dot + status text + `animate-pulse` skeleton blocks | `src/app/dashboard/page.tsx` (lines ~872–888) |
| **Error state** | Red centered error message | `src/app/dashboard/page.tsx` (lines ~892–897) |
| **Streaming indicator** | None — polling every 2s via `useEffect`; no SSE/streaming UI | `src/app/dashboard/page.tsx` (lines ~155–191) |
| **Tab navigation** | Analytics vs AI Creators Suite tabs | `src/app/dashboard/page.tsx` (lines ~342–364) |
| **Data-fetch skeletons** | `animate-pulse` placeholder blocks (keywords, competitors, charts) | `src/app/dashboard/page.tsx` (multiple) |

### Web app — auth entry

| UI role | Implementation | File path |
|---------|----------------|-----------|
| **Login card** | Glassmorphism card with Google OAuth button | `src/app/login/page.tsx` |
| **Loading spinner** | SVG with `animate-spinner` class | `src/app/login/page.tsx` |
| **Error toast** | Slide-in notification | `src/app/login/page.tsx` |

### Browser extension — AI-adjacent UI

| UI role | Implementation | File path |
|---------|----------------|-----------|
| **Floating trigger button** | `#tuberank-trigger` injected on YouTube watch pages | `extension/content.js` |
| **Overlay sidebar** | `#tuberank-overlay` slide-in panel (scorecard, not chat) | `extension/content.js` |
| **Popup input forms** | Keyword search + title generator forms | `extension/popup.html`, `extension/popup.js` |
| **Popup loading skeletons** | `.tuberank-pulse-skeleton` divs | `extension/popup.js`, `extension/popup.html` |
| **Popup result list** | `.title-item`, `.keyword-list` rendered HTML | `extension/popup.js` |

### App shell / providers

| UI role | File path |
|---------|-----------|
| Root layout + font | `src/app/layout.tsx` |
| React Query + NextAuth + PostHog | `src/app/providers.tsx` |
| Global styles + animations | `src/app/globals.css` |
| Error boundary page | `src/app/error.tsx` |
| 404 page | `src/app/not-found.tsx` |

---

## 5. Key UI Files (Full Contents)

The five most important UI files for the AI interaction surface and app shell:

1. `src/app/dashboard/page.tsx` — AI Creators Suite (form + results + polling)
2. `src/app/login/page.tsx` — auth UI with loading/error states
3. `src/app/globals.css` — global styles and custom animations
4. `src/app/providers.tsx` — client providers wrapper
5. `src/app/layout.tsx` — root HTML shell

### `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "./providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TubeRank",
  description: "Advanced YouTube Analytics and SEO Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### `src/app/providers.tsx`

```tsx
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
```

### `src/app/globals.css`

(See section 3 above — identical full file.)

### `src/app/login/page.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type ButtonState = "default" | "hover" | "loading" | "error" | "success";

export default function LoginPage() {
  const router = useRouter();
  const [currentState, setCurrentState] = useState<ButtonState>("default");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Handle auto-dismiss toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const triggerError = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setCurrentState("error");
  };

  const handleGoogleClick = async () => {
    if (currentState === "loading") return;

    setCurrentState("loading");

    // For testing and demo, mock the transition.
    // If NextAuth client environment is fully configured, this will run in parallel.
    setTimeout(() => {
      // Simulate redirection / success
      setCurrentState("success");
      router.push("/onboarding");
    }, 1500);
  };

  // Force specific state from control panel
  const setForcedState = (state: ButtonState) => {
    setCurrentState(state);
    if (state === "error") {
      triggerError("Authentication failed: Google OAuth credentials rejected.");
    } else if (state === "success") {
      router.push("/onboarding");
    } else {
      setShowToast(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden px-4 text-center">
      {/* Background Orbs */}
      <div
        className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] blur-[100px] opacity-5 pointer-events-none animate-orb-1"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#10B981] to-[#3B82F6] blur-[120px] opacity-5 pointer-events-none animate-orb-2"
        aria-hidden="true"
      />

      {/* Error Toast Notification */}
      <div
        role="alert"
        aria-live="assertive"
        className={`fixed top-6 right-6 z-50 flex max-w-sm w-full items-start gap-3 rounded-card bg-[#111115]/90 p-4 shadow-xl backdrop-blur-md transition-all duration-300 ease-out transform ${
          showToast
            ? "translate-x-0 opacity-100"
            : "translate-x-12 opacity-0 pointer-events-none"
        }`}
        style={{ border: "1px solid var(--error)" }}
      >
        <div className="text-error mt-0.5">
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
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-semibold text-text-primary">Sign-in Error</h3>
          <p className="mt-1 text-xs text-text-muted">{toastMessage}</p>
        </div>
        <button
          onClick={() => setShowToast(false)}
          className="text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Glassmorphism Card */}
      <div
        className="relative z-10 w-full max-w-[440px] rounded-card bg-card backdrop-blur-[12px] p-8 shadow-2xl transition-all duration-300"
        style={{ border: "var(--border)" }}
      >
        {/* Logo and Wordmark */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            {/* TubeRank Visual Logo */}
            <svg
              className="h-8 w-8 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
            </svg>
            <span className="text-2xl font-extrabold tracking-tight text-text-primary bg-gradient-to-r from-text-primary to-text-muted bg-clip-text">
              TubeRank
            </span>
          </div>
          <p className="mt-2 text-sm text-text-muted font-medium">
            AI-powered YouTube growth
          </p>
        </div>

        {/* Action Button Area */}
        <div className="mt-8">
          <button
            onClick={handleGoogleClick}
            disabled={currentState === "loading"}
            className={`group relative flex w-full items-center justify-center gap-3 bg-white text-gray-900 font-semibold text-sm transition-all duration-200 ease-out py-3 px-4 rounded-button focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
              currentState === "loading"
                ? "opacity-70 cursor-not-allowed"
                : currentState === "error"
                ? "border border-error"
                : "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
            }`}
          >
            {currentState === "loading" ? (
              <svg
                className="animate-spinner h-5 w-5 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.85 3C6.01 7.71 8.78 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.11 2.73-2.36 3.57l3.67 2.84c2.14-1.98 3.38-4.89 3.38-8.51z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.09 13.72c-.24-.72-.37-1.5-.37-2.3s.13-1.58.37-2.3l-3.85-3C.43 7.84 0 9.87 0 12s.43 4.16 1.24 5.88l3.85-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.67-2.84c-1.01.67-2.31 1.09-4.29 1.09-3.22 0-5.99-2.67-6.91-5.68l-3.85 3C3.2 20.27 7.24 23 12 23z"
                />
              </svg>
            )}
            <span>
              {currentState === "loading"
                ? "Connecting to Google..."
                : "Continue with Google"}
            </span>
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-xs text-text-muted leading-relaxed">
          By continuing, you agree to our{" "}
          <a
            href="/terms"
            className="hover:underline hover:text-text-primary transition-colors focus:outline-none focus:underline"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="hover:underline hover:text-text-primary transition-colors focus:outline-none focus:underline"
          >
            Privacy
          </a>
        </div>
      </div>

      {/* STATE CONTROL PANEL FOR TESTING */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4">
        <div
          className="rounded-card bg-[#111115]/95 p-4 shadow-xl border border-white/5 backdrop-blur-md"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">
            Verification - State Controller
          </h4>
          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => setForcedState("default")}
              className={`py-1 text-[10px] font-bold rounded transition-all ${
                currentState === "default"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setForcedState("hover")}
              className={`py-1 text-[10px] font-bold rounded transition-all ${
                currentState === "hover"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Hover
            </button>
            <button
              onClick={() => setForcedState("loading")}
              className={`py-1 text-[10px] font-bold rounded transition-all ${
                currentState === "loading"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Loading
            </button>
            <button
              onClick={() => setForcedState("error")}
              className={`py-1 text-[10px] font-bold rounded transition-all ${
                currentState === "error"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Error
            </button>
            <button
              onClick={() => setForcedState("success")}
              className={`py-1 text-[10px] font-bold rounded transition-all ${
                currentState === "success"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Success
            </button>
          </div>
          <div className="mt-2 text-[10px] text-text-muted text-center">
            Active state: <span className="font-semibold text-primary">{currentState}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### `src/app/dashboard/page.tsx`

```tsx
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

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // States
  const [keywordInput, setKeywordInput] = useState("");
  const [activeKeywordSearch, setActiveKeywordSearch] = useState("");
  const [channelInput, setChannelInput] = useState("UC_x5XG1OV2P6uYZ5FHSFzKA"); // Default to YouTube Creators channel
  const [activeChannelId, setActiveChannelId] = useState("UC_x5XG1OV2P6uYZ5FHSFzKA");
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
    enabled: !!activeChannelId,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Header */}
      <header className="mb-8 border-b border-slate-800 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
          TubeRank Analytics Dashboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Perform keyword research, track competitors, and view channel analytics details.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-8 gap-4">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "analytics"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          YouTube Analytics
        </button>
        <button
          onClick={() => setActiveTab("ai-suite")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "ai-suite"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
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
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-indigo-400">Keyword Research</h2>
              <form onSubmit={handleKeywordSearch} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Enter search term..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                    <div className="text-xs text-slate-400">Main Volume Index</div>
                    <div className="text-2xl font-black text-indigo-300 mt-1">
                      {keywordData.volume.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Related Suggestions
                    </h3>
                    <ul className="space-y-2">
                      {keywordData.suggestions?.map((item: KeywordSuggestionItem, index: number) => (
                        <li
                          key={index}
                          className="flex justify-between items-center bg-slate-950 border border-slate-800/50 rounded-lg px-3 py-2 text-sm hover:border-indigo-500/30 transition-colors"
                        >
                          <span className="text-slate-300 truncate pr-2">{item.keyword}</span>
                          <span className="text-indigo-400 font-bold text-xs">
                            {item.volume.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-6">
                  Search a keyword to see estimated search volumes. (Costs 1 credit)
                </p>
              )}
            </section>

            {/* Competitors Tracking Panel */}
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-purple-400">Competitors Tracker</h2>
              <form onSubmit={handleAddCompetitor} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newCompetitorId}
                  onChange={(e) => setNewCompetitorId(e.target.value)}
                  placeholder="Enter YouTube Channel ID..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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
                      className="flex justify-between items-center bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm hover:border-purple-500/30 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{comp.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{comp.youtubeId}</div>
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
                <p className="text-slate-500 text-sm text-center py-6">
                  No competitors tracked yet. Add a Channel ID above.
                </p>
              )}
            </section>

          </div>

          {/* Right Column: Channel Analytics & Performance Charts */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Channel Analytics Panel */}
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-blue-400">Channel Statistics & Performance</h2>
                <form onSubmit={handleChannelSearch} className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    placeholder="YouTube Channel ID or Name..."
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:w-56"
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
                  <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
                    {channelData.channel.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={channelData.channel.thumbnailUrl}
                        alt={channelData.channel.title}
                        className="w-12 h-12 rounded-full border border-slate-700 object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-slate-100">{channelData.channel.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{channelData.channel.description}</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Subscribers</div>
                      <div className="text-2xl font-black text-blue-400 mt-1">
                        {parseInt(channelData.stats.subscriberCount, 10).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Views</div>
                      <div className="text-2xl font-black text-indigo-400 mt-1">
                        {parseInt(channelData.stats.viewCount, 10).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Uploads</div>
                      <div className="text-2xl font-black text-purple-400 mt-1">
                        {parseInt(channelData.stats.videoCount, 10).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Recharts Area Chart */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
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
                    <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                      Video Upload History
                    </h4>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800 overflow-hidden">
                      {channelData.history?.map((video: VideoHistoryItem) => (
                        <div key={video.id} className="p-4 flex justify-between items-center hover:bg-slate-900/30 transition-colors">
                          <div className="pr-4">
                            <div className="font-semibold text-slate-200 text-sm line-clamp-1">{video.title}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              Uploaded: {new Date(video.publishedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-4 text-right shrink-0">
                            <div>
                              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Views</div>
                              <div className="text-sm font-bold text-slate-300">
                                {parseInt(video.viewCount, 10).toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Likes</div>
                              <div className="text-sm font-bold text-slate-300">
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
                <p className="text-slate-500 text-sm text-center py-12">
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
                    ? "bg-slate-900 border-slate-700 shadow-lg ring-1 ring-slate-600 scale-[1.02]"
                    : "bg-slate-950 border-slate-900/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className={`font-bold text-xs uppercase ${t.color}`}>{t.name}</div>
                <div className="text-[10px] text-slate-500 mt-1">{t.cost} Credits</div>
              </button>
            ))}
          </div>

          {/* Form and Preview Pane */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Settings Form Column */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl h-fit">
              <h3 className="text-lg font-bold mb-4 capitalize text-indigo-400 border-b border-slate-800 pb-2">
                {selectedTool.replace("-", " ")} Settings
              </h3>

              <form onSubmit={handleAISubmit} className="space-y-4">
                {/* Title generator fields */}
                {selectedTool === "title-generator" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">VIDEO TOPIC / CONCEPT</label>
                      <input
                        type="text"
                        required
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. Building a SaaS in 24 hours"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">KEYWORDS (OPTIONAL)</label>
                      <input
                        type="text"
                        value={aiKeywords}
                        onChange={(e) => setAiKeywords(e.target.value)}
                        placeholder="e.g. saas, nextjs, building in public"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* Description writer fields */}
                {selectedTool === "description-writer" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">VIDEO TITLE</label>
                      <input
                        type="text"
                        required
                        value={aiTitle}
                        onChange={(e) => setAiTitle(e.target.value)}
                        placeholder="e.g. How I Built a SaaS in 24 Hours (Step-by-Step)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">CORE TOPICS / DETAILS</label>
                      <textarea
                        required
                        rows={3}
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. Covered planning, choosing the tech stack, integrating stripe..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* Thumbnail concepts fields */}
                {selectedTool === "thumbnail-concepts" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">VIDEO TITLE</label>
                      <input
                        type="text"
                        required
                        value={aiTitle}
                        onChange={(e) => setAiTitle(e.target.value)}
                        placeholder="e.g. 10 YouTube Hacks To Grow Fast"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">VIDEO DESCRIPTION / SUMMARY</label>
                      <textarea
                        required
                        rows={3}
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        placeholder="e.g. The video goes over algorithm secrets, CTR tips, and hooks..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* Content outline fields */}
                {selectedTool === "content-outline" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">VIDEO TOPIC / GOAL</label>
                      <input
                        type="text"
                        required
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. Introduction to TypeScript Generics"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">TARGET DURATION (OPTIONAL)</label>
                      <input
                        type="text"
                        value={aiDuration}
                        onChange={(e) => setAiDuration(e.target.value)}
                        placeholder="e.g. 10 minutes"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* SEO audit fields */}
                {selectedTool === "seo-audit" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">VIDEO TITLE</label>
                      <input
                        type="text"
                        required
                        value={aiTitle}
                        onChange={(e) => setAiTitle(e.target.value)}
                        placeholder="e.g. Learn NextJS in 10 minutes"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">VIDEO DESCRIPTION</label>
                      <textarea
                        required
                        rows={3}
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        placeholder="e.g. In this tutorial we go over NextJS app router..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">TAGS (OPTIONAL)</label>
                      <input
                        type="text"
                        value={aiTags}
                        onChange={(e) => setAiTags(e.target.value)}
                        placeholder="e.g. nextjs, react, frontend, coding"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
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
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl min-h-[350px] flex flex-col">
              <h3 className="text-lg font-bold mb-4 text-indigo-400 border-b border-slate-800 pb-2">
                AI Output Result
              </h3>

              {/* Idle state */}
              {aiStatus === "idle" && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12 text-center">
                  <p className="text-sm">Configure parameters on the left and click Generate.</p>
                  <p className="text-xs text-slate-600 mt-1">Deducted credits will be fully refunded if the task fails.</p>
                </div>
              )}

              {/* Skeletons while submitting/polling */}
              {(aiStatus === "submitting" || aiStatus === "waiting" || aiStatus === "active") && (
                <div className="space-y-6 flex-1 justify-center flex flex-col py-6">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 bg-indigo-500 rounded-full animate-ping shrink-0"></div>
                    <div className="text-sm text-slate-300 font-semibold capitalize">
                      Status: {aiStatus === "submitting" ? "Submitting request..." : `Job processing in queue (${aiStatus})...`}
                    </div>
                  </div>
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
                  <p className="text-xs text-slate-500 mt-4">Your credit balance has been refunded.</p>
                </div>
              )}

              {/* Completed state / Result Rendering */}
              {aiStatus === "completed" && aiResult && (
                <div className="flex-1 space-y-6">
                  
                  {/* 1. Title Generator Result rendering */}
                  {selectedTool === "title-generator" && aiResult.titles && (
                    <div className="space-y-4">
                      {aiResult.titles.map((t: any, i: number) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-500/30 transition-all">
                          <div className="space-y-1 flex-1">
                            <h4 className="font-bold text-slate-200 text-base">"{t.title}"</h4>
                            <p className="text-xs text-slate-400 font-medium">{t.rationale}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(t.title);
                              alert("Title copied!");
                            }}
                            className="text-xs font-semibold bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg px-3 py-1.5 transition-colors shrink-0"
                          >
                            Copy Title
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 2. Description Writer Result rendering */}
                  {selectedTool === "description-writer" && (
                    <div className="space-y-4 bg-slate-950 border border-slate-800 rounded-xl p-6">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Introduction Summary</h4>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{aiResult.introduction}</p>
                      </div>
                      
                      {aiResult.chapters && aiResult.chapters.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chapters / Timestamps</h4>
                          <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                            {aiResult.chapters.map((ch: any, i: number) => (
                              <div key={i} className="flex gap-4 p-3 text-sm hover:bg-slate-900/20">
                                <span className="font-mono text-indigo-400 font-bold">{ch.timestamp}</span>
                                <span className="text-slate-300">{ch.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Call To Action</h4>
                        <p className="text-sm text-slate-300 leading-relaxed italic">{aiResult.callToAction}</p>
                      </div>

                      {aiResult.tags && aiResult.tags.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {aiResult.tags.map((tag: string, i: number) => (
                              <span key={i} className="text-xs bg-slate-900 border border-slate-800 text-slate-400 rounded-full px-2.5 py-1">
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
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all text-left">
                          <div className="space-y-3">
                            <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-center font-black text-amber-300 tracking-wide text-xs">
                              "{c.textOverlay.toUpperCase()}"
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>
                            
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Visual Elements</div>
                              <ul className="text-xs text-slate-400 space-y-1 list-disc pl-3.5">
                                {c.visualElements?.map((el: string, idx: number) => (
                                  <li key={idx}>{el}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-900">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Color Palette</div>
                            <div className="flex gap-1 flex-wrap">
                              {c.colorPalette?.map((color: string, idx: number) => (
                                <span key={idx} className="text-[9px] bg-slate-900 border border-slate-800 text-amber-400 rounded px-1.5 py-0.5 whitespace-nowrap">
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
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Video Structure</h4>
                          <div className="space-y-3">
                            {aiResult.sections.map((sec: any, i: number) => (
                              <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-purple-500/30 transition-all text-left">
                                <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2.5">
                                  <span className="font-bold text-purple-300 text-sm">{sec.name}</span>
                                  <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono">{sec.durationEstimated}</span>
                                </div>
                                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
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
                          <div className="text-xs text-slate-300 space-y-1.5">
                            {aiResult.keyTakeaways.map((kt: string, i: number) => (
                              <span key={i} className="block text-slate-300">💡 {kt}</span>
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
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">SEO Optimization Score</h4>
                          <p className="text-xs text-slate-500 font-medium">Overall checklist score based on metadata</p>
                        </div>
                        <div className={`text-3xl font-black rounded-lg px-4 py-2 border ${
                          aiResult.score >= 80 ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/20" :
                          aiResult.score >= 50 ? "text-amber-400 border-amber-500/20 bg-amber-950/20" :
                          "text-red-400 border-red-500/20 bg-red-950/20"
                        }`}>
                          {aiResult.score}/100
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5">Strengths</h4>
                          <ul className="text-xs text-slate-300 space-y-1.5">
                            {aiResult.strengths?.map((str: string, i: number) => (
                              <li key={i} className="flex gap-2 items-start">
                                <span className="text-emerald-400 font-bold">✓</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2.5">Areas for Improvement</h4>
                          <ul className="text-xs text-slate-300 space-y-1.5">
                            {aiResult.weaknesses?.map((weak: string, i: number) => (
                              <li key={i} className="flex gap-2 items-start">
                                <span className="text-pink-400 font-bold">⚠</span>
                                <span>{weak}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Recommendations</h4>
                        <ul className="text-xs text-slate-300 space-y-1.5">
                          {aiResult.recommendations?.map((rec: string, i: number) => (
                            <li key={i} className="flex gap-2 items-start">
                              <span className="text-indigo-400 font-bold">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {aiResult.suggestedKeywords && aiResult.suggestedKeywords.length > 0 && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Suggested Keywords</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {aiResult.suggestedKeywords.map((kw: string, i: number) => (
                              <span key={i} className="text-xs bg-slate-900 border border-slate-800 text-indigo-300 rounded px-2 py-0.5">
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
```

---

## 6. Dark / Light Mode Setup

**Current state: No unified theme system.**

| Area | Dark/light support |
|------|-------------------|
| **Root layout** | No `class="dark"` on `<html>`, no `next-themes`, no theme toggle |
| **Tailwind** | `darkMode` not configured in `tailwind.config.ts` (defaults to `prefers-color-scheme`) |
| **Dashboard** | Hardcoded dark theme only (`bg-slate-950`, `text-slate-100`) — always dark |
| **Login** | Uses CSS variables (`--background`, etc.) intended for a design token system, but tokens file is missing; appears designed as dark-first |
| **Extension popup** | Hardcoded dark (`#0f172a` background) — always dark |
| **Extension overlay** | Hardcoded dark glassmorphism — always dark |
| **Default Next.js home (`page.tsx`)** | Uses `dark:` variant classes (e.g. `dark:border-neutral-800`, `dark:invert`) — responds to OS `prefers-color-scheme` only |
| **Error / 404 / CSRF demo** | Light theme only (`bg-gray-50`, `bg-white`) |

**Summary:** The app has no user-controlled dark/light toggle. The main product surfaces (dashboard, login, extension) are dark-themed by convention. Only the scaffold `src/app/page.tsx` uses Tailwind `dark:` prefixes tied to system preference.

---

## 7. Animations / Transitions

### Custom keyframes (`src/app/globals.css`)

| Name | Class | Duration / easing | Used in |
|------|-------|-------------------|---------|
| `meshDrift` | `.animate-orb-1` | 20s ease-in-out infinite alternate | `src/app/login/page.tsx` — background orb (top-left) |
| `meshDrift` | `.animate-orb-2` | 24s ease-in-out infinite alternate-reverse | `src/app/login/page.tsx` — background orb (bottom-right) |
| `spinnerRotate` | `.animate-spinner` | 1s linear infinite | `src/app/login/page.tsx` — Google sign-in loading SVG |
| `stepIn` | `.step-enter` | 250ms ease-out forwards | **Defined but unused** in any TSX file |
| `stepOut` | `.step-exit` | 200ms ease-in forwards | **Defined but unused** in any TSX file |

### Custom keyframes (`extension/content.js`)

| Name | Class | Used in |
|------|-------|---------|
| `pulse` | `.tuberank-pulse-skeleton` | Scorecard loading skeleton in overlay sidebar |

### Custom keyframes (`extension/popup.html`)

| Name | Class | Used in |
|------|-------|---------|
| `pulse` | `.tuberank-pulse-skeleton` | Keyword/title result loading skeletons in `popup.js` |

### Tailwind built-in animation classes

| Class | File | Context |
|-------|------|---------|
| `animate-pulse` | `src/app/dashboard/page.tsx` | Keyword, competitor, chart, and AI result skeleton loaders |
| `animate-ping` | `src/app/dashboard/page.tsx` | AI job polling status indicator dot |

### `transition-*` / `transition-all` usage

| File | Lines (approx.) | What transitions |
|------|-----------------|------------------|
| `src/app/login/page.tsx` | 72, 100, 111, 144, 213, 220, 239–279 | Toast slide/fade, card, button hover, link colors, state controller buttons |
| `src/app/dashboard/page.tsx` | 346, 356, 386, 422, 454, 472, 481, 514, 616, 673, 846, 908, 918, 973, 1013 | Tab borders, button hover colors, list item hovers, tool selector scale, result card borders |
| `src/app/page.tsx` | 45, 51, 62, 68, 79, 85, 96, 102 | Link card hover colors and arrow `translate-x` |
| `extension/content.js` | 48, 71 | Floating trigger button hover; overlay sidebar `right` slide |
| `extension/popup.html` | 73, 114, 131 | Tab buttons, input border-color, primary button hover |

### `transition-transform` usage

| File | Context |
|------|---------|
| `src/app/page.tsx` | Next.js starter link arrows on hover (`group-hover:translate-x-1`) |

### Notes

- No Framer Motion, React Spring, or CSS animation libraries.
- No text streaming / typewriter animation for AI output.
- PROJECT_STATE.md documents a deliberate choice: skeletons use `animate-pulse`; no spinner components in dashboard (login page is the exception with `animate-spinner`).
