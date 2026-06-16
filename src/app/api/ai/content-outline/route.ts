import { handleAIRequest } from "@/lib/ai/controller";
import { apiHandler } from "@/lib/apiHandler";
import { ValidationError } from "@/lib/errors";

export const POST = apiHandler(async (req) => {
  return handleAIRequest(req, "content-outline", 5, (body) => {
    const topic = body.topic?.trim();
    if (!topic) {
      throw new ValidationError("Topic is required", "topic");
    }
    return {
      topic,
      targetDuration: body.targetDuration?.trim() || "",
    };
  });
});
