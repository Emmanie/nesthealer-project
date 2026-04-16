// app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature") as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    // Log fatal signature error to system_logs (Guardian Mode)
    await supabaseAdmin.from("system_logs").insert({
      event_type: "STRIPE_WEBHOOK_SIGNATURE_ERROR",
      message: `Signature verification failed: ${err.message}`,
      severity: "critical"
    });
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const session = event.data.object as any;

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.updated": {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const customerId   = subscription.customer as string;
        const status       = subscription.status;

        const priceId = subscription.items.data[0].price.id;
        let plan = "basic";
        if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID)   plan = "premium";
        if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) plan = "enterprise";

        await supabaseAdmin
          .from("tenants")
          .update({
            plan,
            stripe_subscription_id: subscription.id,
            subscription_status:    status,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const customerId = session.customer as string;
        await supabaseAdmin
          .from("tenants")
          .update({
            plan: "basic",
            stripe_subscription_id: null,
            subscription_status: "canceled",
          })
          .eq("stripe_customer_id", customerId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe Webhook Handler]", err);
    // Log sync error to system_logs (Guardian Mode)
    await supabaseAdmin.from("system_logs").insert({
      event_type: "STRIPE_SYNC_ERROR",
      message: `Failed to sync subscription: ${err.message}`,
      severity: "error",
      metadata: { event_type: event.type, customer_id: session.customer }
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
