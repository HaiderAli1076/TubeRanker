import { handleAIRequest } from "@/lib/ai/controller";
import { apiHandler } from "@/lib/apiHandler";
import { ValidationError } from "@/lib/errors";

export const POST = apiHandler(async (req) => {
  return handleAIRequest(req, "seo-audit", 3, (body) => {
    const title = body.title?.trim();
    const description = body.description?.trim();
    if (!title) {
      throw new ValidationError("Title is required", "title");
    }
    if (!description) {
      throw new ValidationError("Description is required", "description");
    }
    return {
      title,
      description,
      tags: body.tags?.trim() || "",
    };
  });
});
