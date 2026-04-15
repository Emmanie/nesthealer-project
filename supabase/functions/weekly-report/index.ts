import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

Deno.serve(async (_req) => {
  if (!RESEND_API_KEY) {
    return new Response("RESEND_API_KEY not configured", { status: 500 });
  }

  try {
    const { data: tenants, error: tErr } = await supabase
      .from("tenants")
      .select("id, name, alert_email");

    if (tErr) throw tErr;

    for (const tenant of tenants ?? []) {
      if (!tenant.alert_email) continue;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Fetch SLA metrics for the past week
      const { data: metrics } = await supabase
        .from("sla_metrics")
        .select("auto_repaired, repair_duration_ms")
        .eq("tenant_id", tenant.id)
        .gte("incident_start", startDate.toISOString());

      const totalIncidents = metrics?.length || 0;
      const repaired = metrics?.filter((m) => m.auto_repaired).length || 0;
      const totalDurationMs =
        metrics
          ?.filter((m) => m.auto_repaired && m.repair_duration_ms)
          .reduce((acc, m) => acc + (m.repair_duration_ms || 0), 0) || 0;
      
      const mttrSec = repaired > 0 ? (totalDurationMs / repaired) / 1000 : 0;
      const minutesSaved = repaired * 15; // Assume 15 minutes of dev time saved per automatic incident

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #6d28d9;">NeatHealer Weekly Digest</h1>
          <h3>Tenant: ${tenant.name}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #ccc;">Total Incidents</td><td style="font-weight: bold; padding: 10px; border-bottom: 1px solid #ccc;">${totalIncidents}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #ccc;">Auto-Repaired</td><td style="font-weight: bold; padding: 10px; border-bottom: 1px solid #ccc;">${repaired}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #ccc;">Mean Time To Repair (MTTR)</td><td style="font-weight: bold; padding: 10px; border-bottom: 1px solid #ccc;">${Math.round(mttrSec)}s</td></tr>
          </table>
          <p style="margin-top: 30px; font-size: 16px;">
            🤖 Our AI has saved your team approximately <strong>${minutesSaved} minutes</strong> of manual debugging this week.
          </p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NeatHealer <reports@updates.neathealer.com>",
          to: tenant.alert_email,
          subject: `Weekly System Health Report - ${tenant.name}`,
          html,
        }),
      }).catch((err) => console.error(`[weekly-report] Resend fail for ${tenant.name}:`, err));
    }

    return new Response("Reports processed", { status: 200 });
  } catch (err) {
    console.error("[weekly-report] Error:", err);
    return new Response(String(err), { status: 500 });
  }
});
