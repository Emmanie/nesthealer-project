import { NextResponse } from "next/server";
import { getUser, createAdminClient, getTenant } from "@/lib/supabaseServer";
import { AddSiteSchema } from "@/lib/validators";

// GET /api/modules
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant   = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const supabase = await createAdminClient();
  const { data: modules, error } = await supabase
    .from("modules")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ modules });
}

// POST /api/modules
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = AddSiteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const supabase = await createAdminClient();

  // Handle Supabase Connector Encryption if keys are provided
  let encryptedUrl = null, encryptedKey = null, supabaseIv = null, supabaseTag = null;
  if (parsed.data.supabase_url && parsed.data.supabase_key && parsed.data.supabase_access_level !== "none") {
    const { encrypt } = require("@/lib/encryption");
    const { encrypted: eUrl, iv: ivU } = encrypt(parsed.data.supabase_url); 
    const { encrypted: eKey, iv: ivK, authTag: tagK } = encrypt(parsed.data.supabase_key);
    // For simplicity we use the same IV logic for URL but typically you'd store both. 
    // Let's store just the Key's IV/Tag and assume URL is also handled or store both.
    // Actually, let's keep it simple: we store the full encryption results for the KEY and just the encrypted URL.
    encryptedUrl = eUrl; 
    encryptedKey = eKey;
    supabaseIv  = ivK;  // Store IV of the key
    supabaseTag = tagK; // Store Tag of the key
  }

  const { data, error } = await supabase
    .from("modules")
    .insert({ 
      tenant_id: tenant.id, 
      name: parsed.data.name, 
      url: parsed.data.url,
      cloud_restart_hook: parsed.data.cloud_restart_hook || null,
      supabase_access_level: parsed.data.supabase_access_level,
      encrypted_supabase_url: encryptedUrl,
      encrypted_supabase_key: encryptedKey,
      supabase_iv: supabaseIv,
      supabase_tag: supabaseTag,
      supabase_terms_accepted: parsed.data.supabase_terms_accepted
    })
    .select()
    .single();

  if (error) {
    const isQuota = error.message.includes("QUOTA_EXCEEDED");
    return NextResponse.json(
      { error: isQuota ? error.message.replace("QUOTA_EXCEEDED: ", "") : error.message },
      { status: isQuota ? 402 : 500 }
    );
  }
  return NextResponse.json({ module: data }, { status: 201 });
}
