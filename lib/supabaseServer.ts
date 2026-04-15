// lib/supabaseServer.ts — Server-side Supabase client (service role, for API routes)
import { createServerClient as _createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Use service role key for API routes that need to bypass RLS
export async function createAdminClient() {
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: async () => (await cookies()).getAll(),
        setAll: async () => {},
      },
    }
  );
}

// Anon client for reading session / user context
export async function createServerClient() {
  const cookieStore = await cookies();
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — can be ignored
          }
        },
      },
    }
  );
}

/** Returns the authenticated user, or null */
export async function getUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the tenant row for the authenticated user */
export async function getTenant() {
  const supabase = await createAdminClient();
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data;
}
