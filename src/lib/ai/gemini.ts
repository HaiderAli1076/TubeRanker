import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env";
import { AIError } from "../errors";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export async function generateAIContent(prompt: string, systemInstruction?: string): Promise<string> {
  if (env.GEMINI_API_KEY === "mock" || process.env.NODE_ENV === "test") {
    const { getMockAIContent } = await import("./gemini.mock");
    return getMockAIContent(prompt, systemInstruction);
  }

  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const result = await model.generateContent(prompt, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = result.response.text();
    if (!text) {
      throw new AIError("Empty response from AI service");
    }
    return text;
  } catch (e: unknown) {
    clearTimeout(timeout);
    if (
      e instanceof Error &&
      (e.name === "AbortError" || e.message?.includes("aborted"))
    ) {
      throw new AIError("AI_TIMEOUT");
    }
    if (
      typeof e === "object" &&
      e !== null &&
      "name" in e &&
      (e as Record<string, unknown>).name === "AbortError"
    ) {
      throw new AIError("AI_TIMEOUT");
    }
    throw e;
  }
}
