/* eslint-disable no-console */
type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === "production";

function safeSerialize(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
      if (value instanceof Error) {
        return {
          ...value,
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }
    }
    return value;
  });
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  if (isProduction) {
    const serialized = safeSerialize(payload);
    if (level === "error" || level === "warn") {
      console.error(serialized);
    } else {
      console.log(serialized);
    }
  } else {
    const colorReset = "\x1b[0m";
    const colors: Record<LogLevel, string> = {
      info: "\x1b[36m", // Cyan
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
      debug: "\x1b[90m", // Gray
    };

    const color = colors[level] || colorReset;
    const formattedMeta = meta && Object.keys(meta).length > 0 ? ` ${safeSerialize(meta)}` : "";
    const logLine = `${payload.timestamp} [${color}${level.toUpperCase()}${colorReset}]: ${message}${formattedMeta}`;

    if (level === "error" || level === "warn") {
      console.error(logLine);
    } else {
      console.log(logLine);
    }
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
};
