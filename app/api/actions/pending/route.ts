// app/api/actions/pending/route.ts
import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: actions, error } = await supabase
      .from("pending_actions")
      .select("*, modules(name, url)")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ actions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
