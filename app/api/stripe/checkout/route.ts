// app/api/stripe/checkout/route.ts
import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { planType } = await req.json(); // 'premium'
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get price ID from env
    let priceId = "";
    if (planType === "premium")    priceId = process.env.STRIPE_PREMIUM_PRICE_ID!;
    if (planType === "enterprise") priceId = process.env.STRIPE_ENTERPRISE_PRICE_ID!;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: { trial_period_days: 7 },
      success_url: `${req.headers.get("origin")}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
      customer_email: user.email,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
