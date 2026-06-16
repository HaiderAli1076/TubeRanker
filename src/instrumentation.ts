import * as Sentry from "@sentry/nextjs";
import { env } from "./lib/env";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
    });
  }
}
