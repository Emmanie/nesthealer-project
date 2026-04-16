import { NextResponse } from "next/server";
import { getUser, createAdminClient, isSuperAdmin } from "@/lib/supabaseServer";
import { UpdatePlanSchema } from "@/lib/validators";

// GET /api/admin/plan — list all tenants (super-admin only)
export async function GET() {
  try {
    const supabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isSuperAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden", debug: { user: user?.email } }, { status: 403 });
    }

    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id,name,plan,custom_limit,created_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`PostgREST error: ${error.message}`);
    return NextResponse.json({ tenants });
  } catch (err: any) {
    console.error("[ADMIN_PLAN_GET]", err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

// PUT /api/admin/plan — update a tenant's plan
export async function PUT(req: Request) {
  const user = await getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = UpdatePlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("tenants")
    .update({ plan: parsed.data.plan, custom_limit: parsed.data.custom_limit ?? null })
    .eq("id", parsed.data.tenant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
