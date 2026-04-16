import { createAdminClient, isSuperAdmin } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) throw new Error("Missing Supabase Environment Variables (URL/ServiceRoleKey)");

    const supabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isSuperAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden", debug: { userEmail: user?.email } }, { status: 403 });
    }

    // Fetch all sites with tenant name (using service role to bypass RLS)
    const { data: sites, error } = await supabase
      .from("modules")
      .select(`
        id, 
        name, 
        url, 
        status, 
        last_error, 
        autonomy_level,
        tenants!tenant_id ( name )
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`PostgREST Error: ${error.message} (Code: ${error.code})`);

    return NextResponse.json({ sites });
  } catch (err: any) {
    console.error("[ADMIN_SITES_ERROR]", err);
    return NextResponse.json({ error: err.message, details: "Check if autonomy_level column exists in modules table." }, { status: 500 });
  }
}
