/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import * as googleGenAIModule from "@google/generative-ai";
import { AIError } from "../lib/errors";

let mockResolved = false;

// Mock the getGenerativeModel method on GoogleGenerativeAI prototype
// before we import the gemini client to test.
googleGenAIModule.GoogleGenerativeAI.prototype.getGenerativeModel = function () {
  return {
    generateContent: async (
      _prompt: string,
      options?: { signal?: AbortSignal }
    ): Promise<any> => {
      return new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          mockResolved = true;
          resolve({
            response: {
              text: () => "Mocked 35s successful response",
            },
          });
        }, 35000);

        if (options?.signal) {
          options.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new Error("The user aborted a request.");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    },
  } as any;
};

// Now import the wrapped function under test
import { generateAIContent } from "../lib/ai/gemini";

async function runTest() {
  console.log("Executing Gemini timeout test...");
  const start = Date.now();

  try {
    await generateAIContent("Verify AbortController");
    console.error("❌ FAIL: Function resolved successfully instead of timing out.");
    process.exit(1);
  } catch (error: any) {
    const duration = Date.now() - start;
    console.log(`Error received after ${duration}ms:`, {
      name: error.name,
      message: error.message,
    });

    if (error instanceof AIError && error.message === "AI_TIMEOUT") {
      if (duration <= 31000) {
        console.log("✅ SUCCESS: AIError AI_TIMEOUT thrown within 31 seconds!");
        console.log(`✅ Confirm: mockResolved = ${mockResolved} (Expected: false)`);
        if (!mockResolved) {
          console.log("🎉 ALL TIMEOUT CHECKS PASSED!");
          process.exit(0);
        } else {
          console.error("❌ FAIL: Mock resolved before timing out.");
          process.exit(1);
        }
      } else {
        console.error(`❌ FAIL: Threw AI_TIMEOUT but took ${duration}ms (expected <= 31s).`);
        process.exit(1);
      }
    } else {
      console.error("❌ FAIL: Threw unexpected error:", error);
      process.exit(1);
    }
  }
}

runTest().catch((err) => {
  console.error("Test crashed:", err);
  process.exit(1);
});
