/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .url()
    .describe("PostgreSQL connection string. Get from your DB provider or local docker-compose."),

  // Redis
  REDIS_URL: z
    .string()
    .url()
    .describe("Redis connection URL. Get from your Redis provider or local docker-compose."),

  // NextAuth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .describe("Run: openssl rand -basehex 32"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z
    .string()
    .min(1)
    .describe("Google Cloud Console → Credentials → OAuth 2.0 Client IDs"),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .min(1)
    .describe("Google Cloud Console → Credentials → OAuth 2.0 Client IDs"),

  // Stripe
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_")
    .describe("Stripe Dashboard → Developers → API keys"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_")
    .describe("Stripe Dashboard → Developers → Webhooks → signing secret"),

  // YouTube
  YOUTUBE_API_KEY: z
    .string()
    .min(1)
    .describe("Google Cloud Console → APIs & Services → Credentials → API Keys"),

  // Gemini AI (optional — production routes to Groq; gemini.ts is scaffolding only, not in production import graph)
  GEMINI_API_KEY: z
    .string()
    .min(1)
    .optional()
    .describe("Google AI Studio (https://aistudio.google.com/) → API Keys"),
  GEMINI_MODEL: z
    .enum(["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-pro"])
    .default("gemini-1.5-pro")
    .optional()
    .describe("One of: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash"),

  // Groq
  GROQ_API_KEY: z
    .string()
    .startsWith("gsk_")
    .min(1)
    .describe("Groq Console → API Keys"),
  GROQ_MODEL: z
    .string()
    .default("llama-3.3-70b-versatile")
    .describe("Groq model ID"),

  // Resend (optional — email sending not yet implemented; no production code path uses this key)
  RESEND_API_KEY: z
    .string()
    .startsWith("re_")
    .optional()
    .describe("Resend Dashboard (https://resend.com) → API Keys"),

  // Sentry
  SENTRY_DSN: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .describe("Sentry Project Settings → Client Keys (DSN)"),

  // PostHog (public, safe to expose)
  NEXT_PUBLIC_POSTHOG_KEY: z
    .string()
    .startsWith("phc_")
    .describe("PostHog Project Settings → Project API Key"),

  // OpenTelemetry (optional — no OTEL exporter/tracer configured yet; key is validated but never read)
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .url()
    .optional()
    .describe("Your OTLP-compatible backend endpoint (e.g. Jaeger, Axiom, Highlight.io)"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  if (typeof window !== "undefined") {
    // Justification: Cast to any on client-side because client bundle only receives NEXT_PUBLIC_ variables and bypasses full server env validation.
    return {
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
    } as any;
  }

  const skipValidation =
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.NODE_ENV === "production";

  if (skipValidation) {
    return process.env as any;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const missing = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs ?? []).join(", ")}`)
      .join("\n");

    console.error("❌ Invalid environment variables:\n" + missing);
    throw new Error("Invalid environment variables — fix the above and restart the server.");
  }

  return parsed.data;
}

export const env = validateEnv();
