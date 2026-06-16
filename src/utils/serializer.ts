/**
 * Safe string masking utility.
 * Replaces middle section of sensitive strings with ellipses.
 */
export function maskString(str: string | null | undefined): string | null {
  if (!str) return null;
  if (str.length <= 8) return "****";
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

/**
 * Serializes a User object to mask sensitive billing identifiers.
 */
export function serializeUser(
  user: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!user) return null;

  const serialized: Record<string, unknown> = { ...user };

  if (typeof serialized.stripeCustomerId === "string") {
    serialized.stripeCustomerId = maskString(serialized.stripeCustomerId);
  }
  if (typeof serialized.stripeSubscriptionId === "string") {
    serialized.stripeSubscriptionId = maskString(serialized.stripeSubscriptionId);
  }
  if (typeof serialized.stripePriceId === "string") {
    serialized.stripePriceId = maskString(serialized.stripePriceId);
  }

  return serialized;
}

/**
 * Helper to serialize lists of users.
 */
export function serializeUsers(
  users: Record<string, unknown>[] | null | undefined
): Record<string, unknown>[] {
  if (!users) return [];
  return users
    .map((u) => serializeUser(u))
    .filter((u): u is Record<string, unknown> => u !== null);
}
