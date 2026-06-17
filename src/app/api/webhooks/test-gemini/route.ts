import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";

export async function GET() {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "mock") {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured or is set to mock." }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const results: Record<string, string> = {};

  const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
  ];

  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent("Respond with JSON: { \"status\": \"ok\" }");
      const text = result.response.text();
      results[m] = `SUCCESS: ${text}`;
    } catch (error: any) {
      results[m] = `FAILED: ${error.message}`;
    }
  }

  return NextResponse.json({ results });
}
