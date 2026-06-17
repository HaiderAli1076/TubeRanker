import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasRedisUrl: !!process.env.REDIS_URL,
    redisUrlLength: process.env.REDIS_URL?.length || 0,
    redisUrlPrefix: process.env.REDIS_URL?.slice(0, 8) || "none",
  });
}
