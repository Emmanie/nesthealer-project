// app/api/modules/[id]/autonomy/route.ts
import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const { autonomy_level } = await req.json();

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("modules")
      .update({ autonomy_level })
      .eq("id", id);

    if (error) {
      if (error.message.includes("PLAN_RESTRICTED")) {
        return NextResponse.json({ error: "Surgeon mode is reserved for Premium users." }, { status: 403 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
