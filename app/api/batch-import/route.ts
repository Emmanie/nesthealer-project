import { NextResponse } from "next/server";
import { getUser, createAdminClient, getTenant } from "@/lib/supabaseServer";
import { BatchImportSchema } from "@/lib/validators";

// POST /api/batch-import — create a batch import job
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = BatchImportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const tenant   = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("batch_imports")
    .insert({
      tenant_id: tenant.id,
      rows:      parsed.data.rows,
      total:     parsed.data.rows.length,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ import_id: data.id }, { status: 201 });
}
