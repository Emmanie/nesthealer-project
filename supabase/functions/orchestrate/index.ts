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
import { decrypt } from "../_shared/crypto.ts";

const SUPABASE_URL            = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY          = Deno.env.get("ENCRYPTION_KEY")!; // Master key for client secrets
const FETCH_TIMEOUT_MS        = 10_000;
const CHAOS_MODE              = Deno.env.get("ENABLE_CHAOS_MODE") === "true";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

/**
 * Basic HTTP Heartbeat
 */
async function checkSite(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    if (CHAOS_MODE && Math.random() < 0.1) {
      clearTimeout(timer);
      return { ok: false, error: "[CHAOS] Simulated failure injected" };
    }

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "NeatHealer-Bot/1.0" },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (res.ok || res.status === 405) return { ok: true };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Deep DB Health Check (Supabase)
 */
async function checkSupabaseHealth(module: any): Promise<{ ok: boolean; error?: string }> {
  if (!module.supabase_access_level || module.supabase_access_level === "none") return { ok: true };

  try {
    const url = await decrypt(module.encrypted_supabase_url, module.supabase_iv, module.supabase_tag, ENCRYPTION_KEY);
    const key = await decrypt(module.encrypted_supabase_key, module.supabase_iv, module.supabase_tag, ENCRYPTION_KEY);

    const client = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Attempt a light smoke test
    const { error } = await client.from("_neathealer_probe").select("*").limit(1).catch(() => ({ error: null }));
    
    // If we get an error that isn't 'relation not found' (42P01), it means DB is likely down or key invalid.
    // Actually, let's just use a simple connection test
    const { error: pingError } = await client.rpc("get_service_status").catch(() => ({ error: { code: 'P000' } }));
    
    // Best cross-project ping: try to fetch an empty set from a non-existent table and check the error code.
    // If it's a network error/timeout, the code won't be 42P01.
    const { error: testErr } = await client.from("non_existent_table_ping").select("count").limit(1);
    
    if (testErr && testErr.code !== "42P01" && testErr.code !== "PGRST116") {
      return { ok: false, error: `DB Connectivity Error: ${testErr.message} (${testErr.code})` };
    }
    
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Deep Check Failed: ${err.message}` };
  }
}

Deno.serve(async (_req) => {
  try {
    // 0. Update System Health (Guardian Mode)
    await supabase
      .from("system_vitals")
      .update({ 
        last_heartbeat: new Date().toISOString(),
        is_orchestrator_active: true 
      })
      .eq("id", "00000000-0000-0000-0000-000000000000");

    // 1. Fetch all non-killed modules

    if (modErr) {
      console.error("[orchestrate] Failed to fetch modules:", modErr);
      return new Response(JSON.stringify({ error: modErr.message }), { status: 500 });
    }

    const results: string[] = [];

    for (const module of modules as ModuleRow[]) {
      // ── CircuitBreaker ──────────────────────────────────
      if (circuitBreakerIsOpen(module)) {
        results.push(`${module.id}: circuit open, skipping`);
        continue;
      }

      // ── Health checks (HTTP + Deep DB) ──────────────────
      const [httpRes, dbRes] = await Promise.all([
        checkSite(module.url),
        checkSupabaseHealth(module)
      ]);

      const isOk = httpRes.ok && dbRes.ok;
      const combinedError = !httpRes.ok 
        ? httpRes.error 
        : (!dbRes.ok ? dbRes.error : "");

      if (isOk) {
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

        results.push(`${module.id}: healthy (HTTP+DB)`);
        continue;
      }

      // ── Site or DB is DOWN ──────────────────────────────
      const siteError = combinedError;

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

        // ── INTELLIGENT AUTONOMY MODES ────────────────────
        // advisor: Always approval
        // guardian: Auto restart/rollback, manual SQL
        // surgeon: Total auto
        const mode = module.autonomy_level ?? "guardian";
        let status = "pending";
        const proposedSql = (action === "repair" && aiDecision.sql) ? aiDecision.sql : null;

        if (mode === "advisor") {
          status = "pending_approval";
        } else if (mode === "guardian") {
          if (proposedSql) status = "pending_approval";
        } else if (mode === "surgeon") {
          status = "pending";
        }

        // AI Escalation Suggestion
        if (aiDecision.recommend_mode === "surgeon" && mode !== "surgeon") {
           reason += "\n\n[IA RECOMMANDATION] : Ce site nécessite le mode 'Surgeon' pour une réparation SQL automatisée.";
           // Trigger a specific notification action if not already repairing
           if (action !== "repair") {
             await supabase.from("pending_actions").insert({
               tenant_id: module.tenant_id,
               module_id: module.id,
               action_type: "notify",
               reason: "[IA] Recommandation d'activation du mode Surgeon pour " + module.name,
               status: "pending"
             });
           }
        }

        await supabase.from("pending_actions").insert({
          tenant_id:    module.tenant_id,
          module_id:    module.id,
          action_type:  action,
          reason,
          proposed_sql: proposedSql,
          status:       status
        });

        results.push(`${module.id}: queued ${action} (Mode: ${mode}, Status: ${status}) — ${reason}`);
        continue;
      }

      // If a playbook matched, we queue it normally (immediate execution)
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
