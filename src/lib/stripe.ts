import Stripe from "stripe";
import { env } from "./env";
import { prisma } from "./prisma";
import { PaymentError, NotFoundError } from "./errors";
import { logger } from "./logger";

// Initialize Stripe Client
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia", // specify standard API version
  typescript: true,
});

export const PLAN_CREDITS = {
  FREE: 10,
  PRO: 100,
  AGENCY: 500,
} as const;

// Plan mapping with mock/test price IDs
export const STRIPE_PLANS = {
  PRO: {
    priceId: "price_pro_subscription", // Fallback test ID
    credits: PLAN_CREDITS.PRO,
    name: "Pro Plan",
  },
  AGENCY: {
    priceId: "price_agency_subscription", // Fallback test ID
    credits: PLAN_CREDITS.AGENCY,
    name: "Agency Plan",
  },
} as const;

/**
 * Maps a stripe price ID to the plan type / credits.
 */
export function getPlanByPriceId(priceId: string) {
  if (priceId === STRIPE_PLANS.PRO.priceId || priceId.includes("pro")) {
    return STRIPE_PLANS.PRO;
  }
  if (priceId === STRIPE_PLANS.AGENCY.priceId || priceId.includes("agency")) {
    return STRIPE_PLANS.AGENCY;
  }
  return null;
}

/**
 * Creates a Stripe Checkout Session for a specific subscription plan.
 */
export async function createCheckoutSession(
  userId: string,
  plan: "PRO" | "AGENCY",
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const selectedPlan = STRIPE_PLANS[plan];
  if (!selectedPlan) {
    throw new PaymentError("Invalid plan selected");
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: user.stripeCustomerId || undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email || undefined,
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
      },
    });

    if (!session.url) {
      throw new PaymentError("Failed to create Checkout Session URL");
    }

    logger.info("Stripe checkout session created", { userId, plan, sessionId: session.id });
    return session.url;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Error creating Stripe checkout session", { userId, plan, error: message });
    throw new PaymentError(message || "Failed to initiate payment");
  }
}

/**
 * Creates a Stripe Customer Portal Session for billing management.
 */
export async function createCustomerPortalSession(
  userId: string,
  returnUrl: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.stripeCustomerId) {
    throw new PaymentError("No billing profile found. Please subscribe to a plan first.");
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    logger.info("Stripe billing portal session created", { userId, customerId: user.stripeCustomerId });
    return session.url;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Error creating Stripe portal session", { userId, error: message });
    throw new PaymentError(message || "Failed to load billing portal");
  }
}
