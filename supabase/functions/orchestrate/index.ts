// orchestrate/index.ts
// Called every 30 seconds via pg_cron.
// Checks all non-killed modules and queues repair actions as needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  actionGuardAllows,
  buildCircuitReset,
  buildCircuitUpdate,
  circuitBreakerIsOpen,
  consumeActionSlot,
  type ModuleRow,
} from "../_shared/guards.ts";
import { getAIDecision } from "../_shared/ai.ts";

const SUPABASE_URL            = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FETCH_TIMEOUT_MS        = 10_000;
const CHAOS_MODE              = Deno.env.get("ENABLE_CHAOS_MODE") === "true";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function checkSite(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // Chaos mode: randomly simulate a 500 or timeout (~10% chance)
    if (CHAOS_MODE && Math.random() < 0.1) {
      clearTimeout(timer);
      return { ok: false, error: "[CHAOS] Simulated failure injected" };
    }

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (res.ok || res.status === 405) {
      // 405 Method Not Allowed is fine — site is up, just rejects HEAD
      return { ok: true };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

Deno.serve(async (_req) => {
  try {
    // 1. Fetch all non-killed modules
    const { data: modules, error: modErr } = await supabase
      .from("modules")
      .select("*")
      .neq("status", "killed");

    if (modErr) {
      console.error("[orchestrate] Failed to fetch modules:", modErr);
      return new Response(JSON.stringify({ error: modErr.message }), {
        status: 500,
      });
    }

    const results: string[] = [];

    for (const module of modules as ModuleRow[]) {
      // ── CircuitBreaker ──────────────────────────────────
      if (circuitBreakerIsOpen(module)) {
        results.push(`${module.id}: circuit open, skipping`);
        continue;
      }

      // ── Health check ────────────────────────────────────
      const { ok, error: siteError } = await checkSite(module.url);

      if (ok) {
        // Reset circuit and counts
        await supabase
          .from("modules")
          .update(buildCircuitReset())
          .eq("id", module.id);

        // Close any open SLA incident for this module
        await supabase
          .from("sla_metrics")
          .update({
            incident_end:        new Date().toISOString(),
            auto_repaired:       true,
            repair_duration_ms:  0, // resolved naturally
          })
          .eq("module_id", module.id)
          .is("incident_end", null);

        results.push(`${module.id}: healthy`);
        continue;
      }

      // ── Site is DOWN ────────────────────────────────────

      // ActionGuard: max 3 actions/min
      if (!actionGuardAllows(module)) {
        results.push(`${module.id}: action guard blocked`);
        continue;
      }

      // Update consecutive failures + circuit state
      const circuitUpdate = buildCircuitUpdate(module);
      const slotUpdate    = consumeActionSlot(module);
      await supabase
        .from("modules")
        .update({
          ...circuitUpdate,
          ...slotUpdate,
          error_count: module.error_count + 1,
          last_error:  siteError,
        })
        .eq("id", module.id);

      // Open SLA incident if none open
      const { data: openIncident } = await supabase
        .from("sla_metrics")
        .select("id")
        .eq("module_id", module.id)
        .is("incident_end", null)
        .maybeSingle();

      if (!openIncident) {
        await supabase.from("sla_metrics").insert({
          tenant_id:      module.tenant_id,
          module_id:      module.id,
          incident_start: new Date().toISOString(),
        });
      }

      // ── MOTEUR DE RÈGLES (PLAYBOOKS) PRIORITÉ ABSOLUE ──
      const { data: playbooks } = await supabase
        .from("playbooks")
        .select("*")
        .eq("tenant_id", module.tenant_id)
        .eq("enabled", true)
        .order("priority", { ascending: false });

      let action: any = null; // using any to bypass ActionType cast locally
      let reason = "";

      if (playbooks && playbooks.length > 0) {
        for (const pb of playbooks) {
          let match = true;
          for (const [k, v] of Object.entries(pb.conditions)) {
            // Simple generic property matching
            if ((module as Record<string, any>)[k] != v) {
              match = false;
              break;
            }
          }
          if (match) {
            action = pb.action_type;
            reason = `Human Override: Playbook '${pb.name}' applied.`;
            break;
          }
        }
      }

      // Fallback to AI if no human playbook matched
      if (!action) {
        const { data: secrets } = await supabase
          .from("tenant_secrets")
          .select("provider,encrypted_key,iv,auth_tag")
          .eq("tenant_id", module.tenant_id);

        const aiDecision = await getAIDecision(
          module,
          secrets ?? [],
          siteError
        );
        action = aiDecision.action;
        reason = aiDecision.reason;
      }

      // Queue the action
      await supabase.from("pending_actions").insert({
        tenant_id:   module.tenant_id,
        module_id:   module.id,
        action_type: action,
        reason,
      });

      results.push(`${module.id}: queued ${action} — ${reason}`);
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[orchestrate] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
