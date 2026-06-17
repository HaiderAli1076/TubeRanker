import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";
import { AuthError, ValidationError, NotFoundError } from "@/lib/errors";

export const DELETE = apiHandler<{ params: { id: string } }>(async (req, context) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to untrack a competitor");
  }

  const id = context.params.id;

  if (!id) {
    throw new ValidationError("Path parameter 'id' of competitor is required", "id");
  }

  const competitor = await prisma.competitor.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!competitor) {
    throw new NotFoundError("Competitor not found or does not belong to you");
  }

  await prisma.competitor.delete({
    where: { id },
  });

  return NextResponse.json({
    success: true,
    message: "Competitor removed successfully",
  });
});
