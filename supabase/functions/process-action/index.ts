// process-action/index.ts
// Executes a single pending action and logs result to sla_metrics.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SLACK_TIMEOUT_MS      = 5_000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function sendSlack(webhookUrl: string, text: string) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    body: JSON.stringify({ text }),
  });
}

async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    body: JSON.stringify({
      from: "NeatHealer <alerts@neathealer.app>",
      to: [to],
      subject,
      text: body,
    }),
  });
}

async function sendWebhook(url: string, payload: unknown): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    body: JSON.stringify(payload),
  });
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    return res.ok || res.status === 405;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const { action_id } = await req.json();
    if (!action_id) {
      return new Response(JSON.stringify({ error: "Missing action_id" }), {
        status: 400,
      });
    }

    // Fetch action + module + tenant in one round-trip
    const { data: action, error: fetchErr } = await supabase
      .from("pending_actions")
      .select(
        `*, modules(*), tenants(alert_slack_webhook, alert_email, alert_webhook)`
      )
      .eq("id", action_id)
      .single();

    if (fetchErr || !action) {
      return new Response(JSON.stringify({ error: "Action not found" }), {
        status: 404,
      });
    }

    if (action.status !== "pending") {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    // Mark as processing
    await supabase
      .from("pending_actions")
      .update({ status: "processing" })
      .eq("id", action_id);

    const module  = action.modules;
    const tenant  = action.tenants;
    const startMs = Date.now();
    let   result  = "done";

    try {
      switch (action.action_type) {
        case "repair": {
          const ok = await verifyUrl(module.url);
          if (ok) {
            await supabase
              .from("modules")
              .update({ status: "active", error_count: 0, consecutive_failures: 0, circuit_open_until: null, last_success: new Date().toISOString() })
              .eq("id", module.id);
            result = "repaired";
          } else {
            result = "repair failed — site still down";
          }
          break;
        }

        case "restart": {
          await supabase
            .from("modules")
            .update({ status: "restarting" })
            .eq("id", module.id);
          // Wait 5s then re-check
          await new Promise((r) => setTimeout(r, 5000));
          const ok = await verifyUrl(module.url);
          await supabase
            .from("modules")
            .update({ status: ok ? "active" : "error", last_success: ok ? new Date().toISOString() : undefined })
            .eq("id", module.id);
          result = ok ? "restarted successfully" : "restart attempted — site still down";
          break;
        }

        case "rollback": {
          // Backup current config then restore previous
          await supabase
            .from("modules")
            .update({
              config:          module.previous_config,
              previous_config: module.config,
              status:          "active",
            })
            .eq("id", module.id);
          result = "rolled back to previous config";
          break;
        }

        case "kill": {
          await supabase
            .from("modules")
            .update({ status: "killed" })
            .eq("id", module.id);
          result = "module killed";
          break;
        }

        case "ignore": {
          result = "ignored — transient error";
          break;
        }

        case "notify": {
          // Handled below in the notification block
          result = "notification sent";
          break;
        }
      }

      // ── SLA metric update ──────────────────────────────
      const durationMs = Date.now() - startMs;
      await supabase
        .from("sla_metrics")
        .update({
          incident_end:       new Date().toISOString(),
          auto_repaired:      result.includes("success") || result.includes("repaired") || result.includes("rollback"),
          repair_duration_ms: durationMs,
          action_taken:       action.action_type,
        })
        .eq("module_id", module.id)
        .is("incident_end", null);

      // ── Notifications ──────────────────────────────────
      const notifText = `[NeatHealer] ${module.name} (${module.url}) — Action: ${action.action_type} — Result: ${result}`;

      const notIfPromises: Promise<any>[] = [];
      if (tenant.alert_slack_webhook)
        notIfPromises.push(sendSlack(tenant.alert_slack_webhook, notifText).catch(console.warn));
      if (tenant.alert_email)
        notIfPromises.push(sendEmail(tenant.alert_email, `NeatHealer Alert: ${module.name}`, notifText).catch(console.warn));
      if (tenant.alert_webhook)
        notIfPromises.push(sendWebhook(tenant.alert_webhook, { event: "action_result", module_id: module.id, action: action.action_type, result }).catch(console.warn));

      // Trigger dynamic user-configured webhooks via Phase 2 trigger-webhook edge function
      notIfPromises.push(
        supabase.functions.invoke("trigger-webhook", {
          body: { 
            tenant_id: tenant.id, 
            event: "action_result", 
            data: { module_id: module.id, action: action.action_type, result } 
          }
        }).catch(console.warn)
      );

      await Promise.allSettled(notIfPromises);

      // Mark done
      await supabase
        .from("pending_actions")
        .update({ status: "done", result, processed_at: new Date().toISOString() })
        .eq("id", action_id);

      return new Response(JSON.stringify({ action_id, result }), { status: 200 });
    } catch (execErr) {
      await supabase
        .from("pending_actions")
        .update({ status: "failed", result: String(execErr), processed_at: new Date().toISOString() })
        .eq("id", action_id);
      throw execErr;
    }
  } catch (err) {
    console.error("[process-action]", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
