// lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // We allow a fallback for build-time or if the user hasn't set it yet
  // but it will fail at runtime if calls are made without it.
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as any, // Standard stable version
  appInfo: {
    name: "NeatHealer",
    version: "0.1.0",
  },
});
