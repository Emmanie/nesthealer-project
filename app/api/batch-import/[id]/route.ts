import { NextResponse } from "next/server";
import { getUser, createAdminClient, getTenant } from "@/lib/supabaseServer";

// GET /api/batch-import/[id] — poll import job status
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user   = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant   = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("batch_imports")
    .select("id,status,total,succeeded,failed,errors,created_at,completed_at")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
