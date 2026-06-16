import { handleAIRequest } from "@/lib/ai/controller";
import { apiHandler } from "@/lib/apiHandler";
import { ValidationError } from "@/lib/errors";

export const POST = apiHandler(async (req) => {
  return handleAIRequest(req, "description-writer", 3, (body) => {
    const title = body.title?.trim();
    const topic = body.topic?.trim();
    if (!title) {
      throw new ValidationError("Title is required", "title");
    }
    if (!topic) {
      throw new ValidationError("Topic is required", "topic");
    }
    return { title, topic };
  });
});
