/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { env } from "./env";
import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  workspaceId?: string;
  userId?: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

const globalForPrisma = globalThis as unknown as {
  // Justification: globalForPrisma stores the raw un-extended or extended client on globalThis, which has no static type representation.
  prisma: any;
};

const createBasePrismaClient = () => {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

export const basePrisma = globalForPrisma.prisma ?? createBasePrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({
        model,
        operation,
        args,
        query,
      }: {
        model: string;
        operation: string;
        // Justification: Prisma arguments can have dynamic structures depending on the model and method.
        args: any;
        // Justification: The execution callback query expects dynamic inputs and outputs.
        query: (args: any) => Promise<any>;
      }) {
        const store = tenantStorage.getStore();
        if (!store) {
          return query(args);
        }

        const { workspaceId, userId } = store;

        // Skip models that are explicitly not scoped
        const EXCLUDED_MODELS = ["User", "AuditLog", "FeatureFlag", "Workspace", "WorkspaceUser", "CreditLedger", "RedisUsage"];
        if (EXCLUDED_MODELS.includes(model)) {
          return query(args);
        }

        const TENANT_SCOPED_MODELS = ["Channel", "Competitor", "KeywordHistory"];
        const isTenantScoped = TENANT_SCOPED_MODELS.includes(model) || model === "Video";

        if (!isTenantScoped) {
          return query(args);
        }

        // Auto-inject workspaceId and userId on creates
        if (operation === "create") {
          args.data = args.data || {};
          if (TENANT_SCOPED_MODELS.includes(model)) {
            if (workspaceId && args.data.workspaceId === undefined) {
              args.data.workspaceId = workspaceId;
            }
            if (userId && args.data.userId === undefined && (model === "Competitor" || model === "KeywordHistory")) {
              args.data.userId = userId;
            }
          }
          return query(args);
        }

        if (operation === "createMany") {
          if (TENANT_SCOPED_MODELS.includes(model) && args.data) {
            if (Array.isArray(args.data)) {
              for (const item of args.data) {
                if (workspaceId && item.workspaceId === undefined) {
                  item.workspaceId = workspaceId;
                }
                if (userId && item.userId === undefined && (model === "Competitor" || model === "KeywordHistory")) {
                  item.userId = userId;
                }
              }
            } else {
              if (workspaceId && args.data.workspaceId === undefined) {
                args.data.workspaceId = workspaceId;
              }
              if (userId && args.data.userId === undefined && (model === "Competitor" || model === "KeywordHistory")) {
                args.data.userId = userId;
              }
            }
          }
          return query(args);
        }

        // Handle findUnique / findUniqueOrThrow by delegating to findFirst / findFirstOrThrow
        if (operation === "findUnique") {
          // Justification: Dynamic model access via string indexing requires casting the extended client to any.
          return (prisma as any)[model].findFirst(args);
        }
        if (operation === "findUniqueOrThrow") {
          // Justification: Dynamic model access via string indexing requires casting the extended client to any.
          return (prisma as any)[model].findFirstOrThrow(args);
        }

        // Handle update and delete (require unique where, don't support AND/OR)
        if (operation === "update") {
          // Justification: Dynamic model access via string indexing requires casting the extended client to any.
          const record = await (prisma as any)[model].findFirst({
            where: args.where,
            select: { id: true },
          });
          if (!record) {
            throw new Error(`Record not found or access denied in model ${model}`);
          }
          // Justification: Dynamic model access via string indexing requires casting the base client to any.
          return (basePrisma as any)[model].update(args);
        }

        if (operation === "delete") {
          // Justification: Dynamic model access via string indexing requires casting the extended client to any.
          const record = await (prisma as any)[model].findFirst({
            where: args.where,
            select: { id: true },
          });
          if (!record) {
            throw new Error(`Record not found or access denied in model ${model}`);
          }
          // Justification: Dynamic model access via string indexing requires casting the base client to any.
          return (basePrisma as any)[model].delete(args);
        }

        // Auto-inject filters on reads and list-writes
        const queryOperations = [
          "findFirst",
          "findFirstOrThrow",
          "findMany",
          "count",
          "updateMany",
          "deleteMany",
        ];

        if (!queryOperations.includes(operation)) {
          return query(args);
        }

        args.where = args.where || {};

        // Justification: The filter object structure depends dynamically on the model type being processed.
        let filter: any = {};
        if (model === "Channel") {
          filter = workspaceId ? { workspaceId } : { workspaceId: null };
        } else if (model === "Competitor" || model === "KeywordHistory") {
          filter = workspaceId ? { workspaceId } : { userId };
        } else if (model === "Video") {
          filter = workspaceId
            ? { channel: { workspaceId } }
            : { channel: { workspaceId: null } };
        }

        args.where = {
          AND: [args.where, filter]
        };

        return query(args);
      }
    }
  }
});
