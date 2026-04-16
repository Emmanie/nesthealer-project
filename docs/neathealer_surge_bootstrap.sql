-- ============================================================
-- NeatHealer Surgeon Bootstrap Script
-- Run this on your project's SQL Editor to enable AI Surgery.
--
-- What this does:
-- 1. Creates a private schema 'neathealer_internal'
-- 2. Creates a secure function 'neathealer_surge' to run AI-provided SQL.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS neathealer_internal;

/**
 * NeatHealer Surgeon Execution Wrapper
 * This function allows NeatHealer to execute corrective SQL on your project.
 * It uses SECURITY DEFINER to run with high privileges (service_role context).
 */
CREATE OR REPLACE FUNCTION public.neathealer_surge(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- We could add additional logic here to verify a custom token if needed,
  -- but since this is called via RPC, Supabase Auth already handles the
  -- SERVICE_ROLE_KEY check.

  -- Execute the dynamic SQL
  EXECUTE sql_query;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Surgery executed successfully',
    'timestamp', now()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Revoke all from public and grant only to authenticated/service_role
REVOKE ALL ON FUNCTION public.neathealer_surge(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.neathealer_surge(text) TO service_role;

COMMENT ON FUNCTION public.neathealer_surge IS 'AI Surgeon entry point for NeatHealer auto-repairs.';
