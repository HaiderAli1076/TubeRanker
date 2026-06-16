import { handleAIRequest } from "@/lib/ai/controller";
import { apiHandler } from "@/lib/apiHandler";
import { ValidationError } from "@/lib/errors";

export const POST = apiHandler(async (req) => {
  return handleAIRequest(req, "title-generator", 2, (body) => {
    const topic = body.topic?.trim();
    if (!topic) {
      throw new ValidationError("Topic is required", "topic");
    }
    return {
      topic,
      keywords: body.keywords?.trim() || "",
    };
  });
});
