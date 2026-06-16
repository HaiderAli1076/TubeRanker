/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";
import { QuotaError, NotFoundError } from "./errors";
import { createAuditLog } from "./audit";
import { logger } from "./logger";

/**
 * Deducts credits from a user's balance with concurrency safety.
 * Uses SELECT FOR UPDATE inside a database transaction to lock the user row.
 * Writes a CreditLedger row and creates an audit log.
 */
export async function deductCredits(
  userId: string,
  tool: string,
  amount: number,
  prismaInstance = prisma
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Deduction amount must be greater than zero");
  }

  // Justification: tx is cast as any because extended prisma transactions have complex nested types that fail typecheck on raw queries.
  await prismaInstance.$transaction(async (tx: any) => {
    // Query with raw SQL FOR UPDATE to acquire row-level lock
    const users = await tx.$queryRaw<{ credits: number }[]>`
      SELECT credits FROM "User" WHERE id = ${userId} FOR UPDATE
    `;

    const user = users[0];
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.credits < amount) {
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
  });

  // Record audit log
  await createAuditLog(userId, "CREDITS_DEDUCTED", {
    tool,
    amount,
  });

  logger.info("Credits successfully deducted", { userId, tool, amount });
}

/**
 * Adds credits to a user's balance (e.g. from a Stripe purchase).
 * Writes a CreditLedger row and creates an audit log.
 */
export async function addCredits(
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Top-up amount must be greater than zero");
  }

  // Justification: tx is cast as any to bypass complex nested client transaction typecheck errors on update operation.
  await prisma.$transaction(async (tx: any) => {
    // Top-up credits
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: amount,
        },
      },
    });

    // Log the entry in the ledger
    await tx.creditLedger.create({
      data: {
        userId,
        amount,
        description,
      },
    });
  });

  // Record audit log
  await createAuditLog(userId, "CREDITS_ADDED", {
    amount,
    description,
  });

  logger.info("Credits successfully added", { userId, amount, description });
}
