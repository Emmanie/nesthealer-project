// process-action/index.ts
// Executes a single pending action and logs result to sla_metrics.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAlert } from "../_shared/notifications.ts";
import { decrypt } from "../_shared/crypto.ts";
import { validateSql, runSurgery } from "../_shared/surgeon.ts";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY          = Deno.env.get("ENCRYPTION_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// ... (verifyUrl omitted for brevity)

Deno.serve(async (req) => {
  try {
    const { action_id } = await req.json();
    if (!action_id) {
      return new Response(JSON.stringify({ error: "Missing action_id" }), { status: 400 });
    }

    const { data: action, error: fetchErr } = await supabase
      .from("pending_actions")
      .select(`
        *, 
        modules(*), 
        tenants(id, alert_slack_webhook, alert_email, alert_webhook)
      `)
      .eq("id", action_id)
      .single();

    if (fetchErr || !action) {
      return new Response(JSON.stringify({ error: "Action not found" }), { status: 404 });
    }

    // ── Surgeon Guard: Don't process if waiting for approval ──
    if (action.status === "pending_approval") {
      return new Response(JSON.stringify({ status: "waiting_for_approval" }), { status: 200 });
    }

    if (action.status !== "pending") {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    // Mark as processing
    await supabase.from("pending_actions").update({ status: "processing" }).eq("id", action_id);

    const module  = action.modules;
    const tenant  = action.tenants;
    const startMs = Date.now();
    let   result  = "done";

    try {
      switch (action.action_type) {
        case "repair": {
          // ── AI SURGEON EXECUTION ───────────────────────────
          if (action.proposed_sql) {
            // 1. Validate SQL
            const guard = validateSql(action.proposed_sql);
            if (!guard.ok) {
              result = `Surgery blocked: ${guard.error}`;
              break;
            }

            // 2. Decrypt Client Keys
            try {
              const url = await decrypt(module.encrypted_supabase_url, module.supabase_iv, module.supabase_tag, ENCRYPTION_KEY);
              const key = await decrypt(module.encrypted_supabase_key, module.supabase_iv, module.supabase_tag, ENCRYPTION_KEY);
              
              // 3. Run Surgery
              const surge = await runSurgery(url, key, action.proposed_sql);
              if (surge.ok) {
                result = `Surgery SUCCESS: ${JSON.stringify(surge.result)}`;
              } else {
                result = `Surgery FAILED: ${surge.error}`;
              }
            } catch (decErr) {
              result = `Surgery FAILED: Decryption error (${decErr.message})`;
            }
          } 
          
          // Re-verify health after surgery or if it was a simple repair
          const ok = await verifyUrl(module.url);
          if (ok) {
            await supabase.from("modules").update({ 
               status: "active", 
               error_count: 0, 
               consecutive_failures: 0, 
               circuit_open_until: null, 
               last_success: new Date().toISOString() 
            }).eq("id", module.id);
            if (!action.proposed_sql) result = "repaired (ping ok)";
          } else {
            result += " | Site still down after repair attempt";
          }
          break;
        }

        // ... cases restart, rollback, kill, ignore, notify

        case "restart": {
          await supabase
            .from("modules")
            .update({ status: "restarting" })
            .eq("id", module.id);

          // Phase 3 Real Cloud Restart Injection
          if (module.cloud_restart_hook) {
            try {
              // Fire POST request to Vercel/Netlify deploy hook to actually force a rebuild/restart
              await fetch(module.cloud_restart_hook, { method: "POST", signal: AbortSignal.timeout(5000) });
            } catch (e) {
              console.warn("Failed to trigger cloud restart hook", e);
            }
          }

          // Wait 5s to allow server to start booting back up, then re-check
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
      
      const alertPromise = sendAlert({
        target: {
          slack:   tenant.alert_slack_webhook,
          email:   tenant.alert_email,
          webhook: tenant.alert_webhook,
        },
        title: `NeatHealer Alert: ${module.name}`,
        text: notifText,
        payload: { 
          event: "action_result", 
          module_id: module.id, 
          action: action.action_type, 
          result 
        }
      });

      // Trigger dynamic user-configured webhooks via Phase 2 trigger-webhook edge function
      const webhookPromise = supabase.functions.invoke("trigger-webhook", {
        body: { 
          tenant_id: tenant.id, 
          event: "action_result", 
          data: { module_id: module.id, action: action.action_type, result } 
        }
      }).catch(console.warn);

      await Promise.allSettled([alertPromise, webhookPromise]);

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
