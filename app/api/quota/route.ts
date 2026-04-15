import { NextResponse } from "next/server";
import { getUser, createAdminClient } from "@/lib/supabaseServer";
import { getPlanLimit } from "@/lib/planLimits";
import { AlertSettingsSchema } from "@/lib/validators";

// GET /api/quota — returns plan info, quota, and alert settings for current tenant
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createAdminClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id,name,plan,custom_limit,alert_slack_webhook,alert_email,alert_webhook")
    .eq("user_id", user.id)
    .single();

  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { count } = await supabase
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  return NextResponse.json({
    ...tenant,
    used:  count ?? 0,
    limit: getPlanLimit(tenant.plan, tenant.custom_limit),
  });
}

// PATCH /api/quota — update alert settings
export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = AlertSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("tenants")
    .update(parsed.data)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
