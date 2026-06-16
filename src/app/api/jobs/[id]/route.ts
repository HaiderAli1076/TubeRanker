import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { queues } from "@/lib/ai/queue";
import { AuthError, NotFoundError } from "@/lib/errors";

export const GET = apiHandler<{ params: { id: string } }>(async (req, context) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to poll job status");
  }

  const jobId = context.params.id;

  // Search for the job in high, medium, and low priority queues
  let job = await queues.high.getJob(jobId);
  if (!job) job = await queues.medium.getJob(jobId);
  if (!job) job = await queues.low.getJob(jobId);

  if (!job) {
    throw new NotFoundError(`Job with ID ${jobId} not found or has expired`);
  }

  const state = await job.getState();

  return NextResponse.json({
    success: true,
    data: {
      id: job.id,
      state, // "completed" | "failed" | "active" | "waiting" | "delayed"
      result: job.returnvalue || null,
      reason: job.failedReason || null,
    },
  });
});
