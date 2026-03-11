import { loadStripe } from "@stripe/stripe-js";

let stripePromise: ReturnType<typeof loadStripe>;

/**
 * Load Stripe.js library
 * This should be called once at app initialization
 */
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

/**
 * Create a checkout session
 * Call this from a server action to ensure STRIPE_SECRET_KEY is not exposed
 */
export async function createCheckoutSession(priceId: string) {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ priceId }),
  });

  if (!response.ok) {
    throw new Error("Failed to create checkout session");
  }

  return response.json();
}

/**
 * Create a portal session for managing subscriptions
 */
export async function createPortalSession() {
  const response = await fetch("/api/portal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to create portal session");
  }

  return response.json();
}
