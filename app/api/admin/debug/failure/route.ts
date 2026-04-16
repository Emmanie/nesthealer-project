import { createAdminClient, isSuperAdmin } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isSuperAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { module_id, type } = await req.json();

    let errorMessage = "SYNTHETIC_ERROR: Manual failure injection.";
    let status = "error";

    if (type === "db_lock") {
      errorMessage = "DATABASE_LOCKED: Maintenance flag stuck at TRUE. Manual fix required.";
    } else if (type === "timeout") {
      errorMessage = "CONNECTION_TIMEOUT: Upstream service not responding.";
    } else if (type === "broken_code") {
      errorMessage = "500_INTERNAL_SERVER_ERROR: Null pointer reference in entrypoint.";
    }

    const { error } = await supabase
      .from("modules")
      .update({
        status: status,
        last_error: errorMessage,
        error_count: 99 // Visual cue for tests
      })
      .eq("id", module_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Injected ${type} failure.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
