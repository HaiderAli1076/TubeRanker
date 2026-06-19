import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/apiHandler";
import { getCurrentRedisUsage } from "@/lib/redis";
import { AuthError, ForbiddenError } from "@/lib/errors";

export const GET = apiHandler(async (_req) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new AuthError("You must be logged in to view Redis usage");
  }

  const email = session.user.email ?? "";
  const ADMIN_EMAILS = ["haiderali1076912@gmail.com"];
  const isAdmin = ADMIN_EMAILS.includes(email);

  if (!isAdmin) {
    throw new ForbiddenError("Requires admin role");
  }

  const usage = await getCurrentRedisUsage();

  return NextResponse.json({
    success: true,
    data: usage,
  });
});
