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

  // Use basePrisma to retrieve all data across all workspaces/tenants for the user.
  // SECURITY: accounts and sessions are fetched with explicit select clauses that
  // strip live OAuth tokens (access_token, refresh_token) and active session tokens
  // from the response — these are credentials, not personal data, and must not be
  // returned to the client even in a GDPR export.
  const user = await basePrisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      credits: true,
      createdAt: true,
      updatedAt: true,
      // OAuth accounts — provider identity info only, no live tokens
      accounts: {
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          type: true,
          // access_token, refresh_token, token_type, scope, expires_at: REDACTED
        },
      },
      // Active sessions — existence info only, no session tokens
      sessions: {
        select: {
          id: true,
          expires: true,
          // sessionToken: REDACTED — returning a live session token would allow session cloning
        },
      },
      competitors: true,
      ledgers: true,
      auditLogs: true,
      keywordHistory: true,
    },
  });

  if (!user) {
    throw new AuthError("User not found");
  }

  // Fetch workspaces where the user is an owner or member.
  // SECURITY: members list is filtered to only the requesting user's own membership
  // row to avoid leaking other workspace members' userIds.
  const workspaces = await basePrisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      members: {
        where: { userId },
        select: {
          id: true,
          role: true,
          joinedAt: true,
        },
      },
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
