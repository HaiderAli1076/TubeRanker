import { handleAIRequest } from "@/lib/ai/controller";
import { apiHandler } from "@/lib/apiHandler";
import { ValidationError } from "@/lib/errors";

export const POST = apiHandler(async (req) => {
  return handleAIRequest(req, "thumbnail-concepts", 2, (body) => {
    const title = body.title?.trim();
    const description = body.description?.trim();
    if (!title) {
      throw new ValidationError("Title is required", "title");
    }
    if (!description) {
      throw new ValidationError("Description/topic is required", "description");
    }
    return { title, description };
  });
});
