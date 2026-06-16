/* eslint-disable no-console */
import { NextRequest } from "next/server";
import { apiHandler } from "../lib/apiHandler";
import {
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  QuotaError,
  AIError,
  YouTubeError,
  DatabaseError,
  PaymentError,
} from "../lib/errors";

const mockRequest = new NextRequest("http://localhost/api/test");

interface TestCase {
  name: string;
  errorInstance: Error;
  expectedStatus: number;
  expectedJson: {
    success: boolean;
    error: {
      code: string;
      message: string;
      field?: string;
      retryAfter?: number;
    };
  };
}

const testCases: TestCase[] = [
  {
    name: "AuthError",
    errorInstance: new AuthError("Session expired"),
    expectedStatus: 401,
    expectedJson: {
      success: false,
      error: { code: "AUTH_UNAUTHORIZED", message: "Session expired" },
    },
  },
  {
    name: "ForbiddenError",
    errorInstance: new ForbiddenError("Requires admin role"),
    expectedStatus: 403,
    expectedJson: {
      success: false,
      error: { code: "FORBIDDEN", message: "Requires admin role" },
    },
  },
  {
    name: "NotFoundError",
    errorInstance: new NotFoundError("Channel not found"),
    expectedStatus: 404,
    expectedJson: {
      success: false,
      error: { code: "NOT_FOUND", message: "Channel not found" },
    },
  },
  {
    name: "ValidationError",
    errorInstance: new ValidationError("Invalid email format", "email"),
    expectedStatus: 400,
    expectedJson: {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid email format", field: "email" },
    },
  },
  {
    name: "RateLimitError",
    errorInstance: new RateLimitError("Too many requests", 60),
    expectedStatus: 429,
    expectedJson: {
      success: false,
      error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests", retryAfter: 60 },
    },
  },
  {
    name: "QuotaError",
    errorInstance: new QuotaError("Out of credits"),
    expectedStatus: 402,
    expectedJson: {
      success: false,
      error: { code: "QUOTA_EXCEEDED", message: "Out of credits" },
    },
  },
  {
    name: "AIError",
    errorInstance: new AIError("Gemini API timed out"),
    expectedStatus: 502,
    expectedJson: {
      success: false,
      error: { code: "AI_PROVIDER_ERROR", message: "Gemini API timed out" },
    },
  },
  {
    name: "YouTubeError",
    errorInstance: new YouTubeError("YouTube quota exceeded"),
    expectedStatus: 502,
    expectedJson: {
      success: false,
      error: { code: "YOUTUBE_API_ERROR", message: "YouTube quota exceeded" },
    },
  },
  {
    name: "DatabaseError",
    errorInstance: new DatabaseError("Connection lost"),
    expectedStatus: 500,
    expectedJson: {
      success: false,
      error: { code: "DATABASE_ERROR", message: "Connection lost" },
    },
  },
  {
    name: "PaymentError",
    errorInstance: new PaymentError("Card declined"),
    expectedStatus: 402,
    expectedJson: {
      success: false,
      error: { code: "PAYMENT_REQUIRED", message: "Card declined" },
    },
  },
];

async function runTests() {
  console.log("Starting Error Handler and apiHandler tests...\n");
  let failed = false;

  for (const tc of testCases) {
    const handler = apiHandler(async () => {
      throw tc.errorInstance;
    });

    try {
      const response = await handler(mockRequest, {});
      const status = response.status;
      const json = await response.json();

      const statusMatches = status === tc.expectedStatus;
      const jsonMatches = JSON.stringify(json) === JSON.stringify(tc.expectedJson);

      if (statusMatches && jsonMatches) {
        console.log(`\x1b[32m✅ Test passed: ${tc.name}\x1b[0m`);
      } else {
        console.error(`\x1b[31m❌ Test failed: ${tc.name}\x1b[0m`);
        console.error(`   Expected status: ${tc.expectedStatus}, Got: ${status}`);
        console.error(`   Expected JSON:   ${JSON.stringify(tc.expectedJson)}`);
        console.error(`   Got JSON:        ${JSON.stringify(json)}`);
        failed = true;
      }
    } catch (testErr) {
      console.error(`\x1b[31m❌ Test exploded: ${tc.name}\x1b[0m`, testErr);
      failed = true;
    }
  }

  if (failed) {
    console.log("\n❌ Some tests failed.");
    process.exit(1);
  } else {
    console.log("\n\x1b[32m✅ All 10 error classes passed verification tests successfully!\x1b[0m");
    process.exit(0);
  }
}

runTests();
