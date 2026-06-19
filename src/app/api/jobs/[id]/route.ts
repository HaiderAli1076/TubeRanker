import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { getQueues } from "@/lib/ai/queue";
import { AuthError, NotFoundError, ForbiddenError } from "@/lib/errors";

export const GET = apiHandler<{ params: { id: string } }>(async (req, context) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to poll job status");
  }

  const jobId = context.params.id;

  // Search for the job in high, medium, and low priority queues
  let job = await getQueues().high.getJob(jobId);
  if (!job) job = await getQueues().medium.getJob(jobId);
  if (!job) job = await getQueues().low.getJob(jobId);

  if (!job) {
    throw new NotFoundError(`Job with ID ${jobId} not found or has expired`);
  }

  // SECURITY: Verify job ownership before returning any data.
  // BullMQ uses incrementing integer IDs, making brute-force trivial.
  // job.data.userId is set at enqueue time in addAIJob() and is authoritative.
  if (job.data?.userId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this job");
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
