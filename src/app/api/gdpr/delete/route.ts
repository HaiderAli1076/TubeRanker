/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { basePrisma } from "@/lib/prisma";
import { AuthError } from "@/lib/errors";

export const DELETE = apiHandler(async (_req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to delete your account");
  }

  const userId = session.user.id;

  // Use basePrisma to perform operations unfiltered
  // 1. Fetch workspaces owned by this user
  const ownedWorkspaces = await basePrisma.workspace.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  // Justification: w is typed as any to resolve dynamically returned workspace fields.
  const ownedWorkspaceIds = ownedWorkspaces.map((w: any) => w.id);

  // 2. Manually delete Channels belonging to these workspaces (since Channel has no foreign key constraint to Workspace)
  // Deleting a Channel automatically cascadingly deletes all its nested Videos
  await basePrisma.channel.deleteMany({
    where: {
      workspaceId: { in: ownedWorkspaceIds },
    },
  });

  // 3. Delete the User record.
  // This triggers foreign key cascade deletes for: Workspace, WorkspaceUser, Account, Session, Competitor, CreditLedger, AuditLog, and KeywordHistory
  await basePrisma.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({
    success: true,
    message: "Your account and all associated data have been permanently deleted.",
  });
});
