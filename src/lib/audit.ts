import { prisma } from "./prisma";
import { logger } from "./logger";

export async function createAuditLog(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const stringifiedMetadata = metadata ? JSON.stringify(metadata) : null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        metadata: stringifiedMetadata,
      },
    });

    logger.info("Audit log recorded", { userId, action, metadata });
  } catch (error) {
    logger.error("Failed to write audit log", { userId, action, metadata, error });
  }
}
