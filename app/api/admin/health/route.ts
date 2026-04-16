// app/api/admin/health/route.ts
import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden", debug: { user: user?.email, expected: adminEmail } }, { status: 403 });
    }
    
    // Fetch vitals (if any) and logs
    const [vitalsRes, logsRes] = await Promise.all([
      supabase.from("system_vitals").select("*").maybeSingle(),
      supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(20)
    ]);

    if (vitalsRes.error) throw new Error(`PostgREST Error (Vitals): ${vitalsRes.error.message}`);

    return NextResponse.json({
      vitals: vitalsRes.data,
      logs:   logsRes.data || []
    });
  } catch (err: any) {
    console.error("[ADMIN_HEALTH_GET]", err);
    return NextResponse.json({ error: err.message, details: "Ensure table system_vitals exists." }, { status: 500 });
  }
}
