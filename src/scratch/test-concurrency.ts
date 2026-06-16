/* eslint-disable no-console */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { env } from "../lib/env";
import { QuotaError } from "../lib/errors";

// Create two separate database connection pools and Prisma Clients to simulate concurrent HTTP requests
const pool1 = new Pool({ connectionString: env.DATABASE_URL });
const pool2 = new Pool({ connectionString: env.DATABASE_URL });

const prisma1 = new PrismaClient({ adapter: new PrismaPg(pool1) });
const prisma2 = new PrismaClient({ adapter: new PrismaPg(pool2) });

// Instrument a test version of deductCredits with millisecond logging to expose locking delays
async function deductCreditsTest(
  userId: string,
  tool: string,
  amount: number,
  prismaInstance: PrismaClient,
  clientName: string
): Promise<void> {
  const start = Date.now();
  console.log(`  [${clientName}] [${start}ms] Initiating transaction...`);

  await prismaInstance.$transaction(async (tx) => {
    const lockStart = Date.now();
    console.log(`  [${clientName}] [${lockStart}ms] Requesting FOR UPDATE lock...`);

    // Query with raw SQL FOR UPDATE to acquire row-level lock
    const users = await tx.$queryRaw<{ credits: number }[]>`
      SELECT credits FROM "User" WHERE id = ${userId} FOR UPDATE
    `;

    const lockAcquired = Date.now();
    console.log(`  [${clientName}] [${lockAcquired}ms] Lock ACQUIRED (waited ${lockAcquired - lockStart}ms).`);

    const user = users[0];
    if (!user) {
      throw new Error("User not found");
    }

    if (user.credits < amount) {
      const quotaErrTime = Date.now();
      console.log(`  [${clientName}] [${quotaErrTime}ms] Insufficient credits (${user.credits} < ${amount}). Throwing QuotaError...`);
      throw new QuotaError("Insufficient credits");
    }

    // Update credits
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: amount,
        },
      },
    });

    // Log the consumption entry in the ledger
    await tx.creditLedger.create({
      data: {
        userId,
        amount: -amount,
        description: `Consumption: ${tool}`,
      },
    });

    const commitTime = Date.now();
    console.log(`  [${clientName}] [${commitTime}ms] Transaction work done, committing...`);
  });

  const end = Date.now();
  console.log(`  [${clientName}] [${end}ms] Transaction COMMITTED successfully!`);
}

async function runTest() {
  console.log("Starting Concurrency Test (10 Iterations)...");
  let passCount = 0;

  for (let i = 1; i <= 10; i++) {
    console.log(`\n--- Iteration ${i} ---`);

    // 1. Create a test user with exactly 1 credit
    const email = `test-concurrency-${i}-${Date.now()}@example.com`;
    const user = await prisma1.user.create({
      data: {
        email,
        name: `Concurrency Test User ${i}`,
        credits: 1,
      },
    });

    console.log(`Created test user with ID: ${user.id} and credits: ${user.credits}`);

    // 2. Trigger concurrent deductCredits calls using Promise.all to fire them simultaneously
    const p1Call = deductCreditsTest(user.id, "keyword-tool", 1, prisma1, "Client A");
    const p2Call = deductCreditsTest(user.id, "keyword-tool", 1, prisma2, "Client B");

    const results = await Promise.allSettled([p1Call, p2Call]);

    // 3. Inspect results
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    console.log(`Results: Success count = ${succeeded.length}, Failed count = ${failed.length}`);

    // Assertions
    const assertion1 = succeeded.length === 1 && failed.length === 1;
    if (!assertion1) {
      console.error("❌ FAIL: Expected exactly 1 call to succeed and 1 to fail.");
      continue;
    }

    const error = failed[0]?.reason;
    const isQuotaError = error instanceof QuotaError;
    if (!isQuotaError) {
      console.error(`❌ FAIL: Expected the failed request to throw QuotaError, got:`, error);
      continue;
    }
    console.log("✅ Assertion passed: Exactly one QuotaError thrown.");

    // Fetch user from DB and check final balance
    const dbUser = await prisma1.user.findUnique({
      where: { id: user.id },
    });

    const isBalanceZero = dbUser?.credits === 0;
    if (!isBalanceZero) {
      console.error(`❌ FAIL: Expected final balance to be 0, got: ${dbUser?.credits}`);
      continue;
    }
    console.log(`✅ Assertion passed: Final balance is exactly 0.`);

    // Fetch credit ledger rows
    const ledgers = await prisma1.creditLedger.findMany({
      where: { userId: user.id },
    });

    const isLedgerOneRow = ledgers.length === 1;
    if (!isLedgerOneRow) {
      console.error(`❌ FAIL: Expected exactly 1 CreditLedger row, got: ${ledgers.length}`);
      continue;
    }
    console.log("✅ Assertion passed: Exactly 1 CreditLedger row exists.");

    passCount++;
  }

  console.log("\n==========================================");
  if (passCount === 10) {
    console.log("🎉 ALL 10 CONCURRENCY TEST RUNS PASSED SUCCESSFULLY!");
  } else {
    console.error(`❌ CONCURRENCY TEST FAILED. Only ${passCount}/10 runs passed.`);
    process.exit(1);
  }

  // Clean up client instances
  await prisma1.$disconnect();
  await prisma2.$disconnect();
  await pool1.end();
  await pool2.end();
}

runTest().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
