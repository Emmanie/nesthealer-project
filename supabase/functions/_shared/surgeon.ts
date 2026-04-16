// _shared/surgeon.ts
// Secure SQL execution for the AI Surgeon Tool.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FORBIDDEN_KEYWORDS = [
  "DROP",
  "TRUNCATE",
  "ALTER ROLE",
  "GRANT",
  "REVOKE",
  "DELETE FROM auth.",
  "DELETE FROM storage.",
  "pg_terminate_backend",
  "pg_cancel_backend"
];

/**
 * Basic security guard to prevent catastrophic AI hallucinations.
 */
export function validateSql(sql: string): { ok: boolean; error?: string } {
  const upper = sql.toUpperCase();
  
  for (const word of FORBIDDEN_KEYWORDS) {
    if (upper.includes(word)) {
      return { ok: false, error: `Forbidden SQL keyword detected: ${word}` };
    }
  }

  // Ensure DELETE always has a WHERE clause to prevent accidental wiping
  if (upper.includes("DELETE") && !upper.includes("WHERE")) {
    return { ok: false, error: "DELETE commands MUST include a WHERE clause for safety." };
  }

  return { ok: true };
}

/**
 * Connects to the client's remote project and executes the surgeon RPC.
 */
export async function runSurgery(url: string, key: string, sql: string): Promise<{ ok: boolean; result?: any; error?: string }> {
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Call the bootstrap function 'neathealer_surge'
    // This function must exist on the client's project (see docs/neathealer_surge_bootstrap.sql)
    const { data, error } = await client.rpc("neathealer_surge", { sql_query: sql });

    if (error) {
      return { ok: false, error: `${error.message} (${error.code})` };
    }

    return { ok: true, result: data };
  } catch (err: any) {
    return { ok: false, error: `Remote execution failed: ${err.message}` };
  }
}
