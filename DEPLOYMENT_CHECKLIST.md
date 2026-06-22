# Deployment Checklist — TubeRank

Use this document as the final verification guide for deploying TubeRank into production (Vercel + Railway).

---

## 1. Vercel Environment Variables

Set the following variables in Vercel under **Project Settings → Environment Variables**:

| Variable | Scope | Production Value / Description |
| :--- | :--- | :--- |
| `NEXTAUTH_URL` | Web App | `https://tuberank.com` |
| `NEXTAUTH_SECRET` | Web App | Minimum 32-character random hex string (`openssl rand -hex 32`) |
| `DATABASE_URL` | Web App | Production PostgreSQL connection URL (e.g., from Railway) |
| `REDIS_URL` | Web App | Production Redis connection URL (e.g., from Railway) |
| `GOOGLE_CLIENT_ID` | Web App | Production Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Web App | Production Google OAuth Client Secret |
| `STRIPE_SECRET_KEY` | Web App | Production Stripe Secret API key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Web App | Production Stripe webhook signing secret (`whsec_...`) |
| `YOUTUBE_API_KEY` | Web App | Production Google Cloud console API key with YouTube Data API v3 enabled |
| `GEMINI_API_KEY` | Web App | Production Gemini API key from Google AI Studio |
| `GEMINI_MODEL` | Web App | `gemini-2.0-flash` (recommended) |
| `RESEND_API_KEY` | Web App | Production Resend API key (`re_...`) for sending billing notification emails |
| `SENTRY_DSN` | Web App | Production Sentry project DSN URL |
| `NEXT_PUBLIC_POSTHOG_KEY` | Web App | Production PostHog client API key (`phc_...`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Web App | OpenTelemetry collector gateway endpoint |

---

## 2. Railway Infrastructure & Services Setup

TubeRank uses **Railway** to host stateful databases and background worker tasks. Set up these services as follows:

### Service A: PostgreSQL Database
* **Railway Template**: PostgreSQL database instance.
* **Outputs**: Connection details will automatically populate `${{Postgres.DATABASE_URL}}` in the worker and web configurations.

### Service B: Redis Cache & Queue
* **Railway Template**: Redis instance.
* **Outputs**: Connection details will populate `${{Redis.REDIS_URL}}`.

### Service C: BullMQ AI Worker
* **Railway Template**: Deploy from Github repository selecting the sub-process or command path.
* **Start Command**: `npm run worker:ai`
* **Required Environment Variables**:
  * `DATABASE_URL`: Connection string to Service A
  * `REDIS_URL`: Connection string to Service B
  * `GEMINI_API_KEY`: Production Gemini API key
  * `GEMINI_MODEL`: `gemini-2.0-flash`

### Service D: Credit Reset Worker
* **Railway Template**: Private Service / Background Worker (continuous process)
* **Start Command**: `npm run worker:credit-reset`
* **Required Environment Variables**:
  * `DATABASE_URL`: Connection string to Service A
  * `REDIS_URL`: Connection string to Service B

---

## 3. Webhook & OAuth Redirect Registrations

Ensure these production endpoints are updated in external dashboard integrations:

1. **Stripe Webhooks**:
   * Register: `https://tuberank.com/api/webhooks/stripe`
   * Enabled Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, `customer.subscription.updated`.

2. **Google OAuth redirect URI**:
   * Register in Google Cloud Console Credentials page:
     `https://tuberank.com/api/auth/callback/google`

---

## 4. Production Database Migrations

Apply schema migrations to the production database before initiating the web app build:

```bash
# Run migrations using the production database connection string
npx prisma migrate deploy
```

---

## 5. 10-Item Production Smoke Test Checklist

Execute these verification steps end-to-end after deployment to confirm live health:

1. **[ ] Signup**: Connect via `/login` and verify a new database `User` row is created.
2. **[ ] OAuth Login**: Complete Google OAuth flow and verify automatic redirection to `/dashboard`.
3. **[ ] Stripe Checkout**: Initiate subscription purchase, complete Stripe checkout, and confirm credit ledger update (+500/1000 credits).
4. **[ ] Stripe Webhook**: Inspect Vercel log entries and verify Stripe webhook successfully processes ledger increments.
5. **[ ] Scorecard Generation**: Load `/dashboard`, submit video `dQw4w9WgXcQ`, and verify SEO scorecard loads with an overall score calculated.
6. **[ ] AI Tool End-to-End**: Submit a prompt in the AI Suite (e.g. Title Generator), verify the BullMQ job executes, and outputs the title suggestions.
7. **[ ] Credit Deduction**: Verify that executing the AI Title Generator consumes exactly **2 credits** from the user's dashboard balance.
8. **[ ] Competitor Tracking**: Add a new competitor channel in the dashboard sidebar, and verify they appear immediately in the tracked list.
9. **[ ] Keyword Search**: Search for a query (e.g., "nextjs") and verify keyword suggestions and volumes display.
10. **[ ] GDPR Export**: Navigate to `/api/gdpr/export`, verify it returns complete user data as JSON, then verify user is correctly deleted under `/api/gdpr/delete`.
