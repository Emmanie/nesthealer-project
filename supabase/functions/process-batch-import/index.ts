// process-batch-import/index.ts
// Processes a batch_imports job: validates and inserts sites respecting quota.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const { import_id } = await req.json();
    if (!import_id) {
      return new Response(JSON.stringify({ error: "Missing import_id" }), {
        status: 400,
      });
    }

    // Fetch the import job
    const { data: importJob, error: fetchErr } = await supabase
      .from("batch_imports")
      .select("*")
      .eq("id", import_id)
      .single();

    if (fetchErr || !importJob) {
      return new Response(JSON.stringify({ error: "Import job not found" }), {
        status: 404,
      });
    }

    if (importJob.status !== "pending") {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    // Mark as processing
    await supabase
      .from("batch_imports")
      .update({ status: "processing" })
      .eq("id", import_id);

    const rows: { name: string; url: string }[] = importJob.rows ?? [];
    let succeeded = 0;
    let failed    = 0;
    const errors: { row: number; name: string; url: string; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const { name, url } = rows[i];

      // Validate
      if (!name?.trim()) {
        errors.push({ row: i + 1, name, url, error: "Name is required" });
        failed++;
        continue;
      }
      if (!isValidUrl(url)) {
        errors.push({ row: i + 1, name, url, error: "Invalid URL" });
        failed++;
        continue;
      }

      // Insert — enforce_site_limit trigger will raise if quota exceeded
      const { error: insertErr } = await supabase
        .from("modules")
        .insert({ tenant_id: importJob.tenant_id, name: name.trim(), url: url.trim() });

      if (insertErr) {
        errors.push({
          row:   i + 1,
          name,
          url,
          error: insertErr.message.replace(/^QUOTA_EXCEEDED:\s*/, ""),
        });
        failed++;
      } else {
        succeeded++;
      }
    }

    // Mark job complete
    await supabase
      .from("batch_imports")
      .update({
        status:       failed > 0 && succeeded === 0 ? "failed" : "done",
        succeeded,
        failed,
        errors,
        completed_at: new Date().toISOString(),
      })
      .eq("id", import_id);

    return new Response(
      JSON.stringify({ import_id, succeeded, failed, errors }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[process-batch-import]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
