# PROJECT_STATE.md — TubeRank Phase 0

This document is the single source of truth for the project scaffold.
Every future phase should update this document before marking work complete.

---

## Table of Contents

1. [Phase Status](#1-phase-status)
2. [Full Prisma Schema](#2-full-prisma-schema)
3. [Full Environment Variable List](#3-full-environment-variable-list)
4. [Folder & Naming Conventions](#4-folder--naming-conventions)
5. [Docker Services](#5-docker-services)
6. [Package Dependencies](#6-package-dependencies)
7. [Database Indexes](#7-database-indexes)
8. [Scripts Reference](#8-scripts-reference)
9. [Phase 1 Security, Auth & Logging Specifications](#9-phase-1-security-auth--logging-specifications)

---

## 1. Phase Status

| Phase       | Status      | Notes                                                                                                  |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| **Phase 0** | ✅ Complete | Scaffold — Next.js, Docker, Prisma, Env validation, ESLint, Prettier. Migration applied on 2026-06-13. |
| **Phase 1** | ✅ Complete | Auth & Security — NextAuth.js + Google OAuth, 24h JWT, token rotation, typed errors, apiHandler, middleware, feature flags, logger, audit log. Verified on 2026-06-13. |
| **Phase 2** | ✅ Complete | Billing — Stripe billing, webhooks, credit consumption ledger service with raw row-locking transaction, BullMQ worker reset, response serialization, sliding window rate limiter. Verified on 2026-06-13. |
| **Phase 3** | ✅ Complete | YouTube Data & Analytics — YouTube Data API v3 wrapper client (`src/lib/youtube.ts`) with Redis quota tracking (midnight UTC expiration) and 24h caching. Keyword research API (`/api/keywords/search`), Channel Analytics API (`/api/channels/[id]/analytics`) with cursor-based pagination, and Competitors CRUD API (`/api/competitors`). Dashboard UI using Recharts and TanStack Query with animate-pulse skeletons. Verified on 2026-06-13. |
| **Phase 4** | ✅ Complete | AI Creators Suite — Gemini AI integration with 30s AbortController timeout & Promise.race fallbacks. Prompt injection guard. 5 priority queues (ai-high, ai-medium, ai-low) with auto failed job credit refund workers. Redis cache (1-7 days TTL) and 100KB size-checked idempotency caching. Premium Creators Suite dashboard UI. Verified on 2026-06-13. |
| **Phase 5** | ✅ Complete | Scorecard & Competitor Gap Analysis — Mock Gemini provider fallback mechanism. Video Scorecard API (`/api/scorecard`) using the Medium priority queue and documented `SCORE_WEIGHTS` constant. Competitor Gap Analysis (`/api/competitors/gap`) using Gemini Zod-validated output. Paginated Keyword History API (`/api/keywords/history`) with cursor-based pagination. Verified on 2026-06-13. |
| **Phase 6** | ✅ Complete | Chrome Extension — Manifest V3 browser extension with automated token refresh, custom CORS handlers in middleware and apiHandler, YouTube page watch overlay scorecard injections, and keyword search & AI title generation tools. Verified on 2026-06-13. |
| **Phase 7** | ✅ Complete | Multi-Tenancy, Observability, GDPR & Polish — Multi-tenant database middleware, Sentry + PostHog integration, GDPR export/delete endpoints, cascade deletes, and clean typescript health checks. Verified on 2026-06-13. |

### UI/UX Phases

| Phase | Status | Notes |
| --- | --- | --- |
| **UI Phase 0** | ✅ Complete | Design Tokens defined in `tokens.css` and `tailwind.config.ts`. Verified on 2026-06-13. |
| **UI Phase 1A** | ✅ Complete | Login + Onboarding Components: drift orbs, glassmorphism card, 5 Google button states, 3-step wizard, custom select dropdown, debounced search, confirmation modal with focus trap, canvas confetti. Verified on 2026-06-13. |

---

## 2. Full Prisma Schema

Full schema file: `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

// NextAuth Models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id                     String    @id @default(cuid())
  name                   String?
  email                  String?   @unique
  emailVerified          DateTime?
  image                  String?
  credits                Int       @default(10)
  stripeCustomerId       String?   @unique
  stripeSubscriptionId   String?   @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  accounts        Account[]
  sessions        Session[]
  workspaces      WorkspaceUser[]
  ownedWorkspaces Workspace[]
  competitors     Competitor[]
  ledgers         CreditLedger[]
  auditLogs       AuditLog[]
  keywordHistory  KeywordHistory[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// TubeRank Models
model Workspace {
  id        String   @id @default(cuid())
  name      String
  ownerId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner   User            @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members WorkspaceUser[]

  @@index([ownerId])
}

model WorkspaceUser {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  role        String   // "ADMIN", "MEMBER"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([workspaceId])
}

model Channel {
  id           String   @id @default(cuid())
  youtubeId    String   @unique
  title        String
  description  String?  @db.Text
  thumbnailUrl String?
  publishedAt  DateTime
  workspaceId  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  videos Video[]

  @@index([youtubeId])
  @@index([workspaceId])
}

model Video {
  id           String   @id @default(cuid())
  youtubeId    String   @unique
  channelId    String
  title        String
  description  String?  @db.Text
  viewCount    BigInt   @default(0)
  likeCount    BigInt   @default(0)
  commentCount BigInt   @default(0)
  publishedAt  DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  channel Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@index([channelId])
}

model Competitor {
  id           String   @id @default(cuid())
  userId       String
  youtubeId    String   // Channel ID of the competitor
  name         String
  workspaceId  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([workspaceId])
}

model KeywordHistory {
  id          String   @id @default(cuid())
  userId      String
  keyword     String
  volume      Int      @default(0)
  workspaceId String?
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([workspaceId])
}

model CreditLedger {
  id          String   @id @default(cuid())
  userId      String
  amount      Int      // positive for top-up, negative for consumption
  description String
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  description String?
  isEnabled   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  metadata  String?  @db.Text
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

---

## 3. Full Environment Variable List

All variables are Zod-validated in `src/lib/env.ts`. App refuses to start if any is missing.

| Variable                      | Type                            | Description                      | Where to Get                                                     |
| ----------------------------- | ------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`                | `string` (URL)                  | PostgreSQL connection string     | docker-compose or cloud DB provider                              |
| `REDIS_URL`                   | `string` (URL)                  | Redis connection URL             | docker-compose or Redis cloud                                    |
| `NEXTAUTH_SECRET`             | `string` (min 32 chars)         | NextAuth signing secret          | `openssl rand -basehex 32`                                       |
| `GOOGLE_CLIENT_ID`            | `string`                        | Google OAuth client ID           | Google Cloud Console → Credentials                               |
| `GOOGLE_CLIENT_SECRET`        | `string`                        | Google OAuth client secret       | Google Cloud Console → Credentials                               |
| `STRIPE_SECRET_KEY`           | `string` (starts with `sk_`)    | Stripe secret API key            | Stripe Dashboard → API Keys                                      |
| `STRIPE_WEBHOOK_SECRET`       | `string` (starts with `whsec_`) | Stripe webhook signing secret    | Stripe Dashboard → Webhooks                                      |
| `YOUTUBE_API_KEY`             | `string`                        | YouTube Data API v3 key          | Google Cloud Console → API Keys                                  |
| `GEMINI_API_KEY`              | `string`                        | Gemini AI API key                | Google AI Studio                                                 |
| `GEMINI_MODEL`                | `enum`                          | Gemini model name                | One of: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash` |
| `RESEND_API_KEY`              | `string` (starts with `re_`)    | Resend email API key             | Resend Dashboard                                                 |
| `SENTRY_DSN`                  | `string` (URL)                  | Sentry error tracking DSN        | Sentry Project Settings → DSN                                    |
| `NEXT_PUBLIC_POSTHOG_KEY`     | `string` (starts with `phc_`)   | PostHog analytics key            | PostHog Project Settings                                         |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `string` (URL)                  | OpenTelemetry collector endpoint | Your OTLP backend provider                                       |

---

## 4. Folder & Naming Conventions

### Directory Structure

```
tuberank/
├── prisma/
│   ├── schema.prisma           # Single schema file
│   └── migrations/             # Auto-generated SQL migrations
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth route group (Phase 1)
│   │   ├── (dashboard)/        # Protected route group (Phase 6)
│   │   ├── api/                # API route handlers
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # Reusable React components (Phase 6)
│   │   ├── ui/                 # Primitive UI components
│   │   └── shared/             # Shared composite components
│   ├── lib/
│   │   ├── env.ts              # Zod env validation (MUST import first)
│   │   ├── prisma.ts           # Prisma singleton
│   │   ├── auth.ts             # NextAuth config (Phase 1)
│   │   ├── stripe.ts           # Stripe client (Phase 2)
│   │   └── redis.ts            # Redis client (Phase 1)
│   ├── hooks/                  # Custom React hooks (Phase 6)
│   ├── types/                  # Global TypeScript types
│   └── utils/                  # Pure utility functions
├── prisma.config.ts            # Prisma 7 config (datasource URL)
├── docker-compose.yml          # Dev infrastructure
├── .env                        # Local env (gitignored)
├── .env.example                # Template (committed)
├── .eslintrc.json              # ESLint config
├── .prettierrc.json            # Prettier config
├── .prettierignore             # Prettier ignore
├── tsconfig.json               # TypeScript strict config
├── tailwind.config.ts          # Tailwind config
├── README.md                   # Setup instructions
└── PROJECT_STATE.md            # This file
```

### Naming Conventions

| Type                | Convention                                     | Example                |
| ------------------- | ---------------------------------------------- | ---------------------- |
| Files/Folders       | `kebab-case`                                   | `keyword-history.ts`   |
| React components    | `PascalCase`                                   | `VideoCard.tsx`        |
| Variables/functions | `camelCase`                                    | `getUserById`          |
| Constants           | `SCREAMING_SNAKE_CASE`                         | `MAX_CREDITS`          |
| Prisma models       | `PascalCase`                                   | `CreditLedger`         |
| DB columns          | `camelCase` (Prisma) → `snake_case` (Postgres) | `userId` → `user_id`   |
| API routes          | `kebab-case` path segments                     | `/api/keyword-history` |
| Environment vars    | `SCREAMING_SNAKE_CASE`                         | `YOUTUBE_API_KEY`      |

### Key Rules

- All env vars are validated once in `src/lib/env.ts` — **never** use `process.env` directly elsewhere
- Prisma client is a **singleton** in `src/lib/prisma.ts` — never instantiate `PrismaClient` elsewhere
- Server components: no `"use client"` by default
- Client components: must have `"use client"` directive
- API routes: place under `src/app/api/[resource]/route.ts`

---

## 5. Docker Services

Defined in `docker-compose.yml`:

| Service    | Image                | Port   | Volume          |
| ---------- | -------------------- | ------ | --------------- |
| `postgres` | `postgres:16-alpine` | `5432` | `postgres_data` |
| `redis`    | `redis:7-alpine`     | `6379` | `redis_data`    |

**Start:** `docker compose up -d`  
**Stop:** `docker compose down`  
**Reset data:** `docker compose down -v`

---

## 6. Package Dependencies

### Production

| Package                     | Version   | Purpose                       |
| --------------------------- | --------- | ----------------------------- |
| `next`                      | `14.2.3`  | Framework                     |
| `react`                     | `^18`     | UI library                    |
| `react-dom`                 | `^18`     | DOM rendering                 |
| `@prisma/client`            | `^7.8.0`  | Database ORM client           |
| `zod`                       | `^4.x`    | Runtime validation            |
| `next-auth`                 | `^4.24.x` | User Authentication framework |
| `@next-auth/prisma-adapter` | `^1.0.7`  | Prisma adapter for NextAuth   |
| `ioredis`                   | `^5.x`    | Redis client library          |
| `pg`                        | `^8.x`    | PostgreSQL driver client      |
| `@prisma/adapter-pg`        | `^7.8.0`  | PostgreSQL adapter for Prisma |

### Development

| Package                                 | Version  | Purpose                              |
| --------------------------------------- | -------- | ------------------------------------ |
| `prisma`                                | `^7.8.0` | ORM CLI + migrations                 |
| `typescript`                            | `^5`     | Type checker                         |
| `eslint`                                | `^8`     | Linting                              |
| `eslint-config-next`                    | `14.2.3` | Next.js ESLint rules                 |
| `prettier`                              | `^3.x`   | Code formatter                       |
| `@trivago/prettier-plugin-sort-imports` | `^6.x`   | Import sorting plugin                |
| `tailwindcss`                           | `^3.4.1` | Utility CSS                          |
| `@types/*`                              | latest   | Type definitions (Node, React, etc.) |
| `@types/pg`                             | `^8.x`   | PostgreSQL driver type declarations  |

---

## 7. Database Indexes

All required indexes from Phase 0 spec. Confirmed in `prisma/schema.prisma`:

| Model            | Field(s)            | Prisma Declaration             | Notes                    |
| ---------------- | ------------------- | ------------------------------ | ------------------------ |
| `User`           | `email`             | `@unique`                      | Enforced as UNIQUE index |
| `Channel`        | `youtubeId`         | `@unique`                      | Enforced as UNIQUE index |
| `Video`          | `channelId`         | `@@index([channelId])`         | FK lookup index          |
| `Competitor`     | `userId`            | `@@index([userId])`            | FK lookup index          |
| `CreditLedger`   | `userId, createdAt` | `@@index([userId, createdAt])` | Compound index           |
| `AuditLog`       | `userId, createdAt` | `@@index([userId, createdAt])` | Compound index           |
| `Workspace`      | `ownerId`           | `@@index([ownerId])`           | FK lookup index          |
| `WorkspaceUser`  | `workspaceId`       | `@@index([workspaceId])`       | FK lookup index          |
| `KeywordHistory` | `userId`            | `@@index([userId])`            | FK lookup index          |

### Applied SQL Migration Indexes (`20260613131437_init/migration.sql`)

```sql
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");
CREATE INDEX "WorkspaceUser_workspaceId_idx" ON "WorkspaceUser"("workspaceId");
CREATE UNIQUE INDEX "WorkspaceUser_workspaceId_userId_key" ON "WorkspaceUser"("workspaceId", "userId");
CREATE UNIQUE INDEX "Channel_youtubeId_key" ON "Channel"("youtubeId");
CREATE INDEX "Channel_youtubeId_idx" ON "Channel"("youtubeId");
CREATE UNIQUE INDEX "Video_youtubeId_key" ON "Video"("youtubeId");
CREATE INDEX "Video_channelId_idx" ON "Video"("channelId");
CREATE INDEX "Competitor_userId_idx" ON "Competitor"("userId");
CREATE INDEX "KeywordHistory_userId_idx" ON "KeywordHistory"("userId");
CREATE INDEX "CreditLedger_userId_createdAt_idx" ON "CreditLedger"("userId", "createdAt");
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
```

---

## 8. Scripts Reference

| Script         | Command              | Description                  |
| -------------- | -------------------- | ---------------------------- |
| `dev`          | `next dev`           | Start dev server (port 3000) |
| `build`        | `next build`         | Production build             |
| `start`        | `next start`         | Start production server      |
| `lint`         | `next lint`          | Run ESLint                   |
| `format`       | `prettier --write .` | Format all files             |
| `format:check` | `prettier --check .` | Check formatting (CI)        |
| `type-check`   | `tsc --noEmit`       | TypeScript check             |
| `db:generate`  | `prisma generate`    | Regenerate Prisma client     |
| `db:migrate`   | `prisma migrate dev` | Run pending migrations       |
| `db:studio`    | `prisma studio`      | Open Prisma Studio GUI       |

---

## 9. Phase 1 Security, Auth & Logging Specifications

### Error Classes
The following typed error classes are defined in `src/lib/errors.ts`, all extending `AppError`:
- `AuthError` (401) - Unauthorized access
- `ForbiddenError` (403) - Forbidden action/resource access
- `NotFoundError` (404) - Resource not found
- `ValidationError` (400) - Parameter/input validation error, supports an optional `field` string
- `RateLimitError` (429) - Too many requests, supports an optional `retryAfter` number of seconds
- `QuotaError` (402) - Out of service credits
- `AIError` (502) - Gemini provider API failure
- `YouTubeError` (502) - YouTube API request failure
- `DatabaseError` (500) - Shielded database exception
- `PaymentError` (402) - Payment processor failure

### apiHandler Usage Example
The `apiHandler` wrapper intercepts all caught errors, filters database schema leaks, and logs business warnings vs system errors:
```typescript
import { apiHandler } from "@/lib/apiHandler";
import { ValidationError } from "@/lib/errors";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req) => {
  const body = await req.json();
  if (!body.email) {
    throw new ValidationError("Email is required", "email");
  }
  return NextResponse.json({ success: true });
});
```

### Audit Log & Feature Flag Signatures
- **Audit Log Service** (`src/lib/audit.ts`):
  ```typescript
  export async function createAuditLog(
    userId: string,
    action: string,
    metadata?: Record<string, unknown>
  ): Promise<void>
  ```
- **Feature Flags Service** (`src/lib/featureFlags.ts`):
  ```typescript
  export async function isFeatureEnabled(
    key: string,
    userId?: string
  ): Promise<boolean>
  ```
  *Note: Checks Redis cache first (60s TTL) before falling back to querying the database.*

### Middleware Route Protection Table

| Route Pattern | Protected | Behavior |
| --- | --- | --- |
| `/api/auth/*` | **No** | Bypasses auth checks for next-auth login/session routes |
| `/api/webhooks/*` | **No** | Bypasses auth checks for payment/webhooks (e.g. Stripe) |
| `/dashboard/*` | **Yes** | Redirects unauthenticated requests to `/login?callbackUrl=...` |
| `/api/*` (other) | **Yes** | Returns a `401 Unauthorized` JSON payload on unauthenticated requests |
| `/login` | **No** | Redirects authenticated users automatically to `/dashboard` |

### "no console.log" Status
- Centralized logging is completely channeled through `logger` (`src/lib/logger.ts`).
- `console.log` is absent from all production code paths. Its only remaining usages are restricted to test execution outputs (`src/scratch/test-errors.ts`, `src/scratch/test-concurrency.ts`) and within the structured logger service output itself.

---

## 10. Phase 2 Billing & Credits Specifications

### User Model Added Fields
The following fields were added to the `User` model:
- `credits` (`Int`, default `10`): tracks the user's remaining consumption credits.
- `stripeCustomerId` (`String?`, unique): Stripe customer reference.
- `stripeSubscriptionId` (`String?`, unique): Active subscription reference.
- `stripePriceId` (`String?`): Active price/plan reference.
- `stripeCurrentPeriodEnd` (`DateTime?`): End of the current billing cycle.

### Credit Ledger Service Signature
Path: `src/lib/credits.ts`
- **`deductCredits(userId: string, tool: string, amount: number, prismaInstance?: PrismaClient): Promise<void>`**
  - Lock user row using raw PostgreSQL `SELECT credits FROM "User" WHERE id = $1 FOR UPDATE`.
  - Decrement credits and record negative amount in `CreditLedger` table.
  - Generates audit log and structure logs.
- **`addCredits(userId: string, amount: number, description: string): Promise<void>`**
  - Increment credits, log positive ledger entry, and create audit log.

### Stripe Plan -> Credit Mapping
- **Free Plan**: Baseline default of `10` credits/month.
- **Pro Plan** (`price_pro_subscription`): `100` credits/month.
- **Agency Plan** (`price_agency_subscription`): `500` credits/month.

### BullMQ Monthly Reset Worker Configuration
- **Process Name**: `worker:credit-reset`
- **Start Command**: `npm run worker:credit-reset` (starts `tsx src/workers/creditReset.ts`)
- **Queue Configuration**: Name: `'credit-resets'`, Redis-backed. Runs a monthly scheduled cron job (`monthly-cycle-reset`) at midnight on the 1st of every month to process credit resets for all users.
- **Failed Event Logging**: Logs failed jobs explicitly via `logger.error` including job ID, job name, error message, and stack trace.

### Rate Limiter
Path: `src/lib/rateLimit.ts`
- **General**: `100` requests/min per IP.
- **Auth** (`/api/auth/*` and `/login`): `10` requests/min per IP.
- **Header**: Returns `429 Too Many Requests` status code with `Retry-After` header.

---

## 11. Phase 3 YouTube Data & Analytics Specifications

### YouTube Data API Wrapper
Path: `src/lib/youtube.ts`
- Performs standard REST calls directly to `googleapis.com/youtube/v3` (avoiding heavy SDKs).
- Implements daily quota consumption checking and caching.

#### Endpoint Quota Costs
| Function / Endpoint | YouTube Quota Cost | Description |
| --- | --- | --- |
| `getChannelStats` | 1 unit | Fetch snippet and statistics details for a channel |
| `searchVideos` | 100 units | General search endpoint for video listings |
| `getChannelVideos` | 100 units | Search videos uploaded by a specific channel |
| `getKeywordSuggestions` | 100 units | Get YouTube suggestions for keyword planning |

#### Redis Quota Tracking & Midnight UTC Reset
- **Key format**: `youtube:quota:YYYY-MM-DD` (where Date corresponds to UTC date)
- **Increment**: Using `INCRBY` by the corresponding API function cost.
- **Auto-Expiration**: On the first request of the day, sets Redis `EXPIRE` duration to the exact number of seconds remaining until midnight UTC:
  ```typescript
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  const secondsUntilMidnight = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
  await redis.expire(key, secondsUntilMidnight);
  ```
- **Quota Cap**: Checked against a hard ceiling of 10,000 daily units. If exceeded, throws `QuotaError`.

#### Response Caching (CACHE_KEYS mapping)
All fetch requests are checked against Redis first using a 24-hour TTL (86,400 seconds) cache block:
- **Channel Statistics Cache Key**: `yt:channel:${id}`
- **Search Results Cache Key**: `yt:search:${query}`
- **Keyword Suggestions Cache Key**: `yt:keyword:${query}`
- **Channel Video Uploads Cache Key**: `yt:channel-videos:${id}:${limit}:${pageToken}`

### API Routes & Credit Deductions
All metrics/keyword analytics routes require user session authentication, utilize `apiHandler` for typed error shielding, and deduct user credits:
1. **Keyword Research Search (`/api/keywords/search?q=...`)**
   - Deducts **1 credit** per request using `deductCredits(userId, "keyword-search", 1)`.
   - Fetches suggestions and volumes (using Redis-cached wrapper).
   - Writes record into the `KeywordHistory` table.
2. **Channel Analytics (`/api/channels/[id]/analytics`)**
   - Deducts **1 credit** per request using `deductCredits(userId, "channel-analytics", 1)`.
   - Syncs Channel information (saves `youtubeId`, `title`, `description`, `thumbnailUrl`, `publishedAt`).
   - Syncs up to 10 video uploads.
   - Implements cursor-based pagination query on local database records.
3. **Competitors Tracker (`/api/competitors`)**
   - **GET**: Lists all tracked competitors for the user.
   - **POST**: Tracks a new competitor channel (resolves name, checks for duplicates, creates `Competitor` record).
   - **DELETE**: Untracks a competitor by ID.

### Frontend Dashboard UI & Skeletons
- Next.js Dashboard page implemented at `/dashboard`.
- Integrated `recharts` for dynamic Area Chart rendering of channel views and likes.
- Integrated `@tanstack/react-query` with a default `staleTime` of 5 minutes (`300000` ms) to prevent excessive duplicate credit deductions.
- Skeletons use pure CSS layout pulse styling (`animate-pulse`). **Zero loading spinners/spinner components are used.**

---

## 12. Phase 4 AI Infrastructure & 5 AI Tools Specifications

### Gemini Integration
Path: `src/lib/ai/gemini.ts`
- Performs standard content generation utilizing `@google/generative-ai` SDK.
- Configured dynamically with `env.GEMINI_API_KEY` and `env.GEMINI_MODEL`.
- Enforces an explicit 30s timeout using `AbortController` (and abort signals). If aborted, intercepts error and throws `AIError("AI_TIMEOUT")`.

### Prompt Injection Guard
Path: `src/lib/sanitize.ts`
- Intercepts and sanitizes user input texts against common prompt injection patterns (e.g. `ignore previous`, `system instruction`, `you are now`) and throws `ValidationError` if triggered.

### Versioned Prompts & Outputs
- **Prompt Versions**: Prompts stored in `src/lib/ai/prompts/v1/prompts.ts`.
- **Output Zod Schemas**: Schemas defined in `src/lib/ai/schemas.ts`:
  - `titleGeneratorSchema`
  - `descriptionWriterSchema`
  - `thumbnailConceptsSchema`
  - `contentOutlineSchema`
  - `seoAuditSchema`
- **Output Parser**: Implements `parseAIOutput(text, schema)` which strips markdown JSON wrappers (`^````json ... ````$`) before parsing and validation.

### Priority BullMQ Queues & Auto Refund Workers
- **Queue Names**:
  - `ai-high`: Job priority for Agency subscription holders.
  - `ai-medium`: Job priority for Pro subscription holders.
  - `ai-low`: Default low priority for Free tier accounts.
- **Credit Deductions & Worker Logic** (`src/workers/aiWorker.ts`):
  - Deducts tool-specific credits first before placing a task into the queue.
  - If a worker crashes or encounters an error (e.g. Gemini timeout), handles the `failed` event to automatically refund the user's credits:
    ```typescript
    worker.on("failed", async (job, error) => {
      if (job) {
        await refundCredits(job.data.userId, job.data.tool, job.data.credits);
      }
    });
    ```

### Idempotency & Caching Layer
- **Caching**: Generates cache keys based on SHA-256 hashes of stringified options. Caches results in Redis with a 3-day TTL.
- **Idempotency**: Checked via `X-Idempotency-Key` headers.
- **Idempotency Size Limit**: Stores responses under the idempotency keys if they do not exceed **100KB** (`102,400 bytes`). If exceeded, logs a warning and skips Redis caching while returning it to the user.

### API Endpoints & Credit Default Costs
All AI endpoints are POST requests, utilize `handleAIRequest` for uniform controller execution, check user rate limits (5/min/user), check cache/idempotency layers, and submit tasks to BullMQ priority queues:
1. **Title Generator (`/api/ai/title-generator`)** — Costs **2 credits**
2. **Description Writer (`/api/ai/description-writer`)** — Costs **3 credits**
3. **Thumbnail Concepts (`/api/ai/thumbnail-concepts`)** — Costs **2 credits**
4. **Content Outline (`/api/ai/content-outline`)** — Costs **5 credits**
5. **SEO Audit (`/api/ai/seo-audit`)** — Costs **3 credits**
6. **Job Polling (`/api/jobs/[id]`)** — Polled every 2s to retrieve the processing status of BullMQ tasks.

### Dashboard UI Page Integration
- Adds the "AI Creators Suite" tab on the protected `/dashboard` page.
- Provides interactive forms for the 5 AI tools with input boxes.
- Implements task submission, progress polling, CSS pulse loading skeletons, and interactive visually appealing card/table layouts for completed AI outputs.

---

## 13. Phase 5 Scorecard & Competitor Gap Analysis Specifications

### Mock Gemini Provider
- **Mock logic** (`src/lib/ai/gemini.mock.ts`): Bypasses Gemini API quota limits. Conditionally intercepts requests in `generateAIContent` (`src/lib/ai/gemini.ts`) when `GEMINI_API_KEY === "mock"` or `process.env.NODE_ENV === "test"`.
- Returns schema-valid, highly realistic structured JSON mock strings for all tools (including `seo-audit`, `video-scorecard`, and `competitor-gap`).

### Scoring Formula & Weights
Defined globally as a documented constant in `src/lib/ai/scorecard.ts`:
- **Title Weight**: `0.30`
- **Description Weight**: `0.25`
- **Tags Weight**: `0.25`
- **Thumbnail Weight**: `0.20`

Combined calculation:
$$\text{Overall Score} = \text{round}(S_{\text{title}} \times 0.30 + S_{\text{description}} \times 0.25 + S_{\text{tags}} \times 0.25 + S_{\text{thumbnail}} \times 0.20)$$

### New API Endpoints & Credit Costs
1. **Video Scorecard (`/api/scorecard`)** — Costs **3 credits**
   - POST request, validates `videoId` input.
   - Enqueues job explicitly to the **Medium priority queue** (`ai-medium` / `'medium'`).
   - Retrieves YouTube video details (using cached fetcher `getVideoDetails`), audits SEO via Gemini (or mock), applies weights, and returns combined scorecard payload.
2. **Competitor Gap Analysis (`/api/competitors/gap`)** — Costs **5 credits**
   - POST request, enqueues job on priority queue, audits content & metadata gaps using Gemini.
   - Outputs Zod-validated analysis (`competitorGapSchema`).
3. **Keyword History Pagination (`/api/keywords/history`)** — Free (GET request)
   - Fetches history for logged-in user with cursor-based pagination (`cursor` and `limit` query parameters).

---

## 14. Phase 6 Chrome Extension Specifications

### Token Issuance Endpoint
- **Endpoint**: `/api/extension/token` (Edge Runtime compatible)
- **Authentication**: Requires a valid NextAuth session cookie (`getToken`).
- **Signature**: Signs with `NEXTAUTH_SECRET` using standard Web Cryptography APIs via the `jose` library.
- **Expiry claim (`exp`) calculation**: UNIX epoch in seconds (`Math.floor(Date.now() / 1000)`) plus `300` (exactly 5 minutes).
- **Response schema**:
  ```json
  {
    "success": true,
    "data": {
      "token": "JWT_STRING",
      "expiresAt": 1781358000000
    }
  }
  ```
  *(Note: `expiresAt` is returned in milliseconds for direct `Date.now()` comparison).*

### chrome.storage Schema
Stored under `extension_token` inside `chrome.storage.local`:
```typescript
interface ChromeStorageSchema {
  extension_token?: {
    token: string;      // The short-lived JWT signed by the backend
    expiresAt: number;  // Expiration timestamp in milliseconds (Date.now() + 5 * 60 * 1000)
  };
  session_error?: string; // Captured error message if NextAuth session is expired/401
}
```

### Content Security Policy (CSP) Block
Defined in `extension/manifest.json`:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' http://localhost:3000 https://tuberank.com https://*.youtube.com https://*.googleapis.com;"
}
```
*Guarantees zero wildcard remote script sources and limits remote fetches strictly to dev/prod hosts and YouTube domains.*

### CORS Configuration
- **OPTIONS Preflight requests**: Intercepted in `src/middleware.ts` for all incoming requests carrying a `chrome-extension://` origin header. Returns a `204 No Content` response with the allowed CORS headers directly, bypassing downstream NextAuth token validation checks.
- **Route handlers**: Standard responses (both success and error states wrapped by `apiHandler`) append the appropriate headers:
  - `Access-Control-Allow-Origin`: The dynamic chrome-extension origin (e.g. `chrome-extension://<id>`).
  - `Access-Control-Allow-Credentials`: `true` (required to pass cookies for session checks).
  - `Access-Control-Allow-Methods`: `GET, POST, OPTIONS`
  - `Access-Control-Allow-Headers`: `Content-Type, Authorization, x-idempotency-key`

---

## 15. Phase 7 Multi-Tenancy, Sentry, PostHog & GDPR Specifications

### Multi-Tenancy Middleware
- **Scoped Models**: `Channel`, `Competitor`, `KeywordHistory`.
- **Query Interceptor**: Applied via Prisma `$extends` query middleware in `src/lib/prisma.ts`.
- **Filtering Rules**:
  - Filters by active context `workspaceId` when present in the AsyncLocalStorage context.
  - Falls back to `userId` when `workspaceId` is null/undefined (for `Competitor` and `KeywordHistory` only, since `Channel` does not carry a `userId`).
  - `Video`: Filtered cascadingly via the relation `channel: { workspaceId }`.
- **Bypassed / Excluded Models**: `User`, `AuditLog`, `FeatureFlag`, `Workspace`, `WorkspaceUser`, `CreditLedger` are explicitly skipped (no filters applied).
- **Prisma Gotcha Workaround**: Intercepts operations that do not support logical operators (`AND`/`OR`) inside the `where` parameter:
  - `findUnique` & `findUniqueOrThrow` are transparently delegated to `findFirst` & `findFirstOrThrow` respectively.
  - `update` & `delete` perform a pre-flight `findFirst` check within the tenant context. If allowed, they bypass filter constraints by executing on the unextended client singleton `basePrisma`.

### OpenTelemetry
- **Installed Packages**:
  - `@opentelemetry/sdk-node` (`^0.219.0`)
  - `@opentelemetry/auto-instrumentations-node` (`^0.77.0`)
  - `@opentelemetry/exporter-otlp-http` (`^0.26.0`)
- Registered inside `src/instrumentation.ts` via experimental Next.js features (`experimental: { instrumentationHook: true }` enabled in `next.config.mjs`).

### Sentry Error Tracking
- **Initialization**: Initialized in `src/instrumentation.ts` for Node.js and Edge runtimes.
- **Exception Capture**: Reports all database/Prisma exceptions and unhandled API runtime failures (500s) inside `src/lib/apiHandler.ts` using `Sentry.captureException(error)`.

### PostHog Analytics
- **Initialization**: Configured client-side in `src/app/providers.tsx` via `SessionProvider` session updates.
- **Privacy Mode**: Auto-capturing is disabled (`autocapture: false`, `capture_pageview: false`, `capture_heatmaps: false`) to restrict tracking strictly to explicit business events.
- **Events Tracked**:
  - `user_signed_in`: Logged when the client session state changes to authenticated.
  - `scorecard_generated`: Tracked when the user successfully fetches channel analytics.
  - `ai_tool_used`: Triggered when an AI creators suite generator tool is invoked.
  - `competitor_added`: Tracked when a competitor youtube channel is added.

### GDPR Export / Delete
- **GDPR Export (`/api/gdpr/export`)**: Fetches all user details, accounts, sessions, competitors, history, credit ledgers, and audit logs. Cross-references workspaces the user belongs to and outputs all associated channels and videos safely.
- **GDPR Delete (`/api/gdpr/delete`)**: Deletes all loose workspaces, channel, and video records not natively cascade-linked, and deletes the `User` record to fire the database-level cascades.

### Cascade Delete Mappings
The following cascades are configured at the schema/foreign-key level:

| Model | Relationship | onDelete Action |
| :--- | :--- | :--- |
| **Account** | `user` | `Cascade` |
| **Session** | `user` | `Cascade` |
| **WorkspaceUser** | `user` / `workspace` | `Cascade` / `Cascade` |
| **Workspace** | `owner` | `Cascade` *(Added in Phase 7)* |
| **Competitor** | `user` | `Cascade` |
| **KeywordHistory** | `user` | `Cascade` |
| **CreditLedger** | `user` | `Cascade` |
| **AuditLog** | `user` | `Cascade` |
| **Video** | `channel` | `Cascade` |


