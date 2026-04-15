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
  const { data, error } = await supabase
    .from("modules")
    .insert({ tenant_id: tenant.id, name: parsed.data.name, url: parsed.data.url })
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
