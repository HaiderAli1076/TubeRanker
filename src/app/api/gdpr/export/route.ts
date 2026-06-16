/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { basePrisma } from "@/lib/prisma";
import { AuthError } from "@/lib/errors";

export const GET = apiHandler(async (_req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to export your data");
  }

  const userId = session.user.id;

  // Use basePrisma to retrieve all data across all workspaces/tenants for the user
  const user = await basePrisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
      sessions: true,
      competitors: true,
      ledgers: true,
      auditLogs: true,
      keywordHistory: true,
    },
  });

  if (!user) {
    throw new AuthError("User not found");
  }

  // Fetch workspaces where the user is an owner or member
  const workspaces = await basePrisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: true,
    },
  });

  // Justification: w is typed as any to safely extract dynamic workspace properties.
  const workspaceIds = workspaces.map((w: any) => w.id);

  // Fetch channels and videos scoped to these workspaces
  const channels = await basePrisma.channel.findMany({
    where: {
      workspaceId: { in: workspaceIds },
    },
    include: {
      videos: true,
    },
  });

  // Map BigInt to string in videos for safe JSON serialization
  // Justification: channel is typed as any to clone and map dynamic nested relations.
  const formattedChannels = channels.map((channel: any) => ({
    ...channel,
    // Justification: v is typed as any to map BigInt fields to string format for safety.
    videos: channel.videos.map((v: any) => ({
      ...v,
      viewCount: v.viewCount.toString(),
      likeCount: v.likeCount.toString(),
      commentCount: v.commentCount.toString(),
    })),
  }));

  return NextResponse.json({
    success: true,
    data: {
      user,
      workspaces,
      channels: formattedChannels,
    },
  });
});
