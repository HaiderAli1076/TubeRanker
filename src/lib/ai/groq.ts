import Groq from "groq-sdk";
import { env } from "../env";
import { AIError } from "../errors";

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

export async function generateAIContent(prompt: string, systemInstruction?: string): Promise<string> {
  const messages: any[] = [];
  
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const chatCompletion = await groq.chat.completions.create(
      {
        messages,
        model: env.GROQ_MODEL,
        response_format: { type: "json_object" },
      },
      { signal: controller.signal }
    );

    const text = chatCompletion.choices[0]?.message?.content;
    
    if (!text) {
      throw new AIError("Empty response from AI service");
    }
    
    return text;
  } catch (e: unknown) {
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
  } finally {
    clearTimeout(timeout);
  }
}
