import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { tenant_id, event, data } = payload;

    if (!tenant_id || !event) {
      return new Response("Missing tenant_id or event", { status: 400 });
    }

    const { data: webhooks, error } = await supabase
      .from("outgoing_webhooks")
      .select("url")
      .eq("tenant_id", tenant_id)
      .eq("active", true);

    if (error) {
      console.error("[trigger-webhook] Failed to fetch webhooks:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response("No active webhooks", { status: 200 });
    }

    const requests = webhooks.map((wh) =>
      fetch(wh.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data,
        }),
      }).catch((err) => {
        console.error(`[trigger-webhook] Failed to hit ${wh.url}`, err);
      })
    );

    // Run parallel, fire and forget essentially, but we await to log results if needed
    await Promise.allSettled(requests);

    return new Response(JSON.stringify({ triggered: webhooks.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[trigger-webhook] Unexpected error:", err);
    return new Response(String(err), { status: 500 });
  }
});
