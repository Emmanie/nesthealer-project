import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";

export async function GET(
  req: Request,
  { params }: { params: { tenantId: string } }
) {
  const tenant_id = params.tenantId;
  const supabase = await createAdminClient();

  // 1. Verify if the tenant exists and has public status page enabled
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("name, public_status_page")
    .eq("id", tenant_id)
    .single();

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (!tenant.public_status_page) {
    return NextResponse.json({ error: "This status page is private" }, { status: 403 });
  }

  // 2. Fetch public module data
  const { data: modules, error: modErr } = await supabase
    .from("modules")
    .select("id, name, url, status, last_success")
    .eq("tenant_id", tenant_id)
    .order("name", { ascending: true });

  if (modErr) {
    return NextResponse.json({ error: "Failed to fetch status data" }, { status: 500 });
  }

  return NextResponse.json({
    tenant_name: tenant.name,
    modules: modules
  });
}
