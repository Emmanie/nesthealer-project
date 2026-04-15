import { NextResponse } from "next/server";
import { getUser, createAdminClient, getTenant } from "@/lib/supabaseServer";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const supabase = await createAdminClient();
  
  // Outer Join with action_feedback to load the user's vote
  const { data: logs, error } = await supabase
    .from("pending_actions")
    .select(`
      id, module_id, action_type, result, created_at,
      action_feedback ( feedback )
    `)
    .eq("tenant_id", tenant.id)
    .in("status", ["done", "failed"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Format for frontend
  const formattedLogs = logs.map(l => ({
    ...l,
    feedback: Array.isArray(l.action_feedback) && l.action_feedback.length > 0 
      ? l.action_feedback[0].feedback 
      : null
  }));

  return NextResponse.json({ logs: formattedLogs });
}
