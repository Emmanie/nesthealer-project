-- ============================================================
-- NeatHealer Guardian Mode v7
-- Self-monitoring infrastructure and Auto-Restart Watchdog
-- ============================================================

-- Table for system vital signs
CREATE TABLE IF NOT EXISTS public.system_vitals (
  id           UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  is_orchestrator_active BOOLEAN DEFAULT TRUE,
  stripe_status TEXT DEFAULT 'ok',
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_row_only CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Seed with the initial record
INSERT INTO public.system_vitals (id) VALUES ('00000000-0000-0000-0000-000000000000'::uuid)
ON CONFLICT DO NOTHING;

-- Table for internal platform logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  message    TEXT NOT NULL,
  metadata   JSONB,
  severity   TEXT DEFAULT 'info', -- 'info', 'warn', 'error', 'critical'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only Super-Admin or Service Role
ALTER TABLE public.system_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only vital access" ON public.system_vitals;
CREATE POLICY "Admin only vital access" ON public.system_vitals
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@neathealer.com'); 

DROP POLICY IF EXISTS "Admin only log access" ON public.system_logs;
CREATE POLICY "Admin only log access" ON public.system_logs
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@neathealer.com');

-- ============================================================
-- WATCHDOG LOGIC (Auto-Restart)
-- ============================================================

CREATE OR REPLACE FUNCTION public.system_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_hb TIMESTAMPTZ;
  v_orchestrate_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Get last heartbeat
  SELECT last_heartbeat INTO v_last_hb FROM public.system_vitals WHERE id = '00000000-0000-0000-0000-000000000000';

  -- If heartbeat is older than 2 minutes, the orchestrator is likely stalled
  IF v_last_hb < NOW() - INTERVAL '2 minutes' THEN
    
    -- Log the incident
    INSERT INTO public.system_logs (event_type, message, severity)
    VALUES ('WATCHDOG_RESTART', 'Orchestrator heartbeat stall detected. Attempting auto-restart...', 'critical');

    -- Invoke orchestrator Edge Function
    -- Note: This requires the pg_net extension to be enabled in Supabase
    -- The URL usually follows: https://[project_ref].supabase.co/functions/v1/orchestrate
    -- We can fetch the URL/Key from settings or env if available, 
    -- but here we assume the cron can call it if configured correctly.
    
    -- In a real Supabase environment, you'd use pg_net:
    -- PERFORM net.http_post(
    --   url := 'https://' || current_setting('app.supabase_url') || '/functions/v1/orchestrate',
    --   headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'))
    -- );
    
    -- For now, we update the status so the Admin Dashboard flags it
    UPDATE public.system_vitals SET is_orchestrator_active = FALSE WHERE id = '00000000-0000-0000-0000-000000000000';
  END IF;
END;
$$;

-- Schedule the Watchdog every 1 minute
-- SELECT cron.schedule('neathealer-watchdog', '* * * * *', 'SELECT public.system_watchdog()');

COMMENT ON TABLE public.system_vitals IS 'Platform vital signs for Guardian Mode.';
COMMENT ON TABLE public.system_logs IS 'Internal platform error and event logs.';
