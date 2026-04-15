import { NextResponse } from "next/server";
import { getUser, createAdminClient, getTenant } from "@/lib/supabaseServer";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const supabase = await createAdminClient();
  const { data: webhooks, error } = await supabase
    .from("outgoing_webhooks")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhooks });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  if (!body.url || !body.name) {
    return NextResponse.json({ error: "Missing url or name" }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("outgoing_webhooks")
    .insert({
      tenant_id: tenant.id,
      name:      body.name,
      url:       body.url,
      events:    body.events ?? ["incident_status"],
      active:    true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
