import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Querying RedisUsage table structure from database...");
  try {
    const columns = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'RedisUsage';
    `;
    console.log("RedisUsage Table Columns:");
    console.log(columns);
  } catch (error) {
    console.error("Error querying table columns:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
