import { handleAIRequest } from "@/lib/ai/controller";
import { apiHandler } from "@/lib/apiHandler";
import { ValidationError } from "@/lib/errors";

export const POST = apiHandler(async (req) => {
  return handleAIRequest(req, "competitor-gap", 5, (body) => {
    const userChannel = body.userChannel?.trim();
    const competitorChannels = body.competitorChannels?.trim();
    if (!userChannel) {
      throw new ValidationError("User channel details are required", "userChannel");
    }
    if (!competitorChannels) {
      throw new ValidationError("Competitor channels details are required", "competitorChannels");
    }
    return {
      userChannel,
      competitorChannels,
    };
  });
});
