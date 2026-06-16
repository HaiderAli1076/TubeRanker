import { NextResponse } from "next/server";
import { stripe, getPlanByPriceId, PLAN_CREDITS } from "@/lib/stripe";
import { addCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";



export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Stripe signature verification failed", { error: errorMessage });
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  logger.info(`Received Stripe webhook event: ${event.type}`, { eventId: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const planName = session.metadata?.plan;

        if (!userId) {
          logger.warn("No userId found in checkout session metadata", { sessionId: session.id });
          break;
        }

        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        // Retrieve subscription to get current period end and price details
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as any;
        const stripePriceId = subscription.items.data[0].price.id;
        const stripeCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // Find credits mapped to this price ID
        const plan = getPlanByPriceId(stripePriceId);
        const creditsToTopUp = plan ? plan.credits : (planName === "PRO" ? PLAN_CREDITS.PRO : PLAN_CREDITS.AGENCY);

        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId,
            stripeSubscriptionId,
            stripePriceId,
            stripeCurrentPeriodEnd,
          },
        });

        // Top up user's credits
        await addCredits(
          userId,
          creditsToTopUp,
          `Stripe Checkout: Initial top-up for ${plan ? plan.name : planName} Plan`
        );

        await createAuditLog(userId, "STRIPE_CHECKOUT_COMPLETED", {
          subscriptionId: stripeSubscriptionId,
          planName: plan ? plan.name : planName,
        });

        break;
      }

      case "invoice.payment_succeeded": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const stripeSubscriptionId = invoice.subscription as string;

        if (!stripeSubscriptionId) {
          break;
        }

        // Find user associated with this subscription
        const user = await prisma.user.findUnique({
          where: { stripeSubscriptionId },
        });

        if (!user) {
          logger.warn("No user found with matching subscription ID on invoice payment", { stripeSubscriptionId });
          break;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as any;
        const stripePriceId = subscription.items.data[0].price.id;
        const stripeCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);

        const plan = getPlanByPriceId(stripePriceId);
        const creditsToTopUp = plan ? plan.credits : PLAN_CREDITS.PRO; // fallback

        // Update billing period end date
        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripePriceId,
            stripeCurrentPeriodEnd,
          },
        });

        // Add credits for the new billing cycle
        await addCredits(
          user.id,
          creditsToTopUp,
          `Stripe Recurring Invoice: Monthly reset for ${plan ? plan.name : "Subscribed"} Plan`
        );

        await createAuditLog(user.id, "STRIPE_RENEWAL_COMPLETED", {
          subscriptionId: stripeSubscriptionId,
          amountPaid: invoice.amount_paid,
        });

        break;
      }

      case "customer.subscription.updated": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        const stripeSubscriptionId = subscription.id as string;

        const user = await prisma.user.findUnique({
          where: { stripeSubscriptionId },
        });

        if (!user) {
          break;
        }

        const stripePriceId = subscription.items.data[0].price.id;
        const stripeCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripePriceId,
            stripeCurrentPeriodEnd,
          },
        });

        await createAuditLog(user.id, "STRIPE_SUBSCRIPTION_UPDATED", {
          subscriptionId: stripeSubscriptionId,
          status: subscription.status,
        });

        break;
      }

      case "customer.subscription.deleted": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        const stripeSubscriptionId = subscription.id as string;

        const user = await prisma.user.findUnique({
          where: { stripeSubscriptionId },
        });

        if (!user) {
          break;
        }

        // Downgrade user to free status and reset/set default credits
        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
            credits: PLAN_CREDITS.FREE, // downgrade to free tier baseline
          },
        });

        await createAuditLog(user.id, "STRIPE_SUBSCRIPTION_CANCELLED", {
          subscriptionId: stripeSubscriptionId,
        });

        break;
      }

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Error processing Stripe webhook event", { eventType: event.type, error: errorMessage });
    return new NextResponse(`Internal Processing Error: ${errorMessage}`, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
