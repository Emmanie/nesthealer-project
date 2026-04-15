import { NextResponse } from "next/server";
import { getUser, createAdminClient, getTenant } from "@/lib/supabaseServer";
import { AddSecretSchema } from "@/lib/validators";
import { encrypt } from "@/lib/encryption";

// GET /api/secrets — list provider names (not the actual keys)
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant   = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const supabase = await createAdminClient();
  const { data: secrets, error } = await supabase
    .from("tenant_secrets")
    .select("id,provider,created_at")
    .eq("tenant_id", tenant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ secrets });
}

// POST /api/secrets — add or replace an encrypted API key
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = AddSecretSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { encrypted, iv, authTag } = encrypt(parsed.data.api_key);

  const supabase = await createAdminClient();
  // Upsert — replace existing key for same provider
  const { error } = await supabase.from("tenant_secrets").upsert(
    {
      tenant_id:     tenant.id,
      provider:      parsed.data.provider,
      encrypted_key: encrypted,
      iv,
      auth_tag:      authTag,
    },
    { onConflict: "tenant_id,provider" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
