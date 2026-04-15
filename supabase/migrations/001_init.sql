-- ============================================================
-- NeatHealer — Full Database Migration v1
-- Run in: Supabase SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net"  SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" SCHEMA cron;

-- ============================================================
-- TABLES
-- ============================================================

-- Tenants: one per authenticated user
CREATE TABLE IF NOT EXISTS public.tenants (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name           TEXT        NOT NULL,
  plan           TEXT        NOT NULL DEFAULT 'basic'
                             CHECK (plan IN ('basic','premium','enterprise','unlimited','custom')),
  custom_limit   INT,
  api_key_hash   TEXT        UNIQUE,
  alert_slack_webhook TEXT,
  alert_email    TEXT,
  alert_webhook  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Modules: monitored websites
CREATE TABLE IF NOT EXISTS public.modules (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name                  TEXT        NOT NULL,
  url                   TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','error','restarting','circuitOpen','killed')),
  error_count           INT         NOT NULL DEFAULT 0,
  consecutive_failures  INT         NOT NULL DEFAULT 0,
  circuit_open_until    TIMESTAMPTZ,
  action_count_minute   INT         NOT NULL DEFAULT 0,
  action_count_reset_at TIMESTAMPTZ,
  last_error            TEXT,
  last_success          TIMESTAMPTZ,
  config                JSONB       NOT NULL DEFAULT '{}',
  previous_config       JSONB       NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pending actions queue
CREATE TABLE IF NOT EXISTS public.pending_actions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        REFERENCES public.tenants(id)  ON DELETE CASCADE NOT NULL,
  module_id    UUID        REFERENCES public.modules(id)  ON DELETE CASCADE NOT NULL,
  action_type  TEXT        NOT NULL
               CHECK (action_type IN ('repair','restart','rollback','kill','ignore','notify')),
  reason       TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','processing','done','failed')),
  result       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Encrypted tenant AI secrets
CREATE TABLE IF NOT EXISTS public.tenant_secrets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  provider      TEXT        NOT NULL
                CHECK (provider IN ('openai','claude','deepseek','gemini')),
  encrypted_key TEXT        NOT NULL,
  iv            TEXT        NOT NULL,
  auth_tag      TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider)
);

-- SLA metrics / incident log
CREATE TABLE IF NOT EXISTS public.sla_metrics (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        REFERENCES public.tenants(id)  ON DELETE CASCADE NOT NULL,
  module_id           UUID        REFERENCES public.modules(id)  ON DELETE CASCADE NOT NULL,
  incident_start      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  incident_end        TIMESTAMPTZ,
  auto_repaired       BOOLEAN     NOT NULL DEFAULT FALSE,
  repair_duration_ms  INT,
  action_taken        TEXT
);

-- Batch import jobs
CREATE TABLE IF NOT EXISTS public.batch_imports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','processing','done','failed')),
  total        INT         NOT NULL DEFAULT 0,
  succeeded    INT         NOT NULL DEFAULT 0,
  failed       INT         NOT NULL DEFAULT 0,
  errors       JSONB       NOT NULL DEFAULT '[]',
  rows         JSONB       NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_modules_tenant_id          ON public.modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_modules_status             ON public.modules(status);
CREATE INDEX IF NOT EXISTS idx_pending_actions_tenant_id  ON public.pending_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_actions_status     ON public.pending_actions(status);
CREATE INDEX IF NOT EXISTS idx_pending_actions_module_id  ON public.pending_actions(module_id);
CREATE INDEX IF NOT EXISTS idx_sla_metrics_tenant_id      ON public.sla_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sla_metrics_module_id      ON public.sla_metrics(module_id);
CREATE INDEX IF NOT EXISTS idx_batch_imports_tenant_id    ON public.batch_imports(tenant_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_metrics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_imports  ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow re-run
DROP POLICY IF EXISTS "tenants_own"  ON public.tenants;
DROP POLICY IF EXISTS "modules_own"  ON public.modules;
DROP POLICY IF EXISTS "actions_own"  ON public.pending_actions;
DROP POLICY IF EXISTS "secrets_own"  ON public.tenant_secrets;
DROP POLICY IF EXISTS "sla_own"      ON public.sla_metrics;
DROP POLICY IF EXISTS "imports_own"  ON public.batch_imports;

CREATE POLICY "tenants_own" ON public.tenants
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "modules_own" ON public.modules
  FOR ALL USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

CREATE POLICY "actions_own" ON public.pending_actions
  FOR ALL USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

CREATE POLICY "secrets_own" ON public.tenant_secrets
  FOR ALL USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

CREATE POLICY "sla_own" ON public.sla_metrics
  FOR ALL USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

CREATE POLICY "imports_own" ON public.batch_imports
  FOR ALL USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- 1. Auto-create tenant row on user signup
CREATE OR REPLACE FUNCTION public.create_tenant_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.tenants (user_id, name, plan)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'basic'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_tenant_on_signup();

-- 2. Enforce site quota before insert
CREATE OR REPLACE FUNCTION public.enforce_site_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan         TEXT;
  v_custom_limit INT;
  v_limit        INT;
  v_count        INT;
BEGIN
  SELECT plan, custom_limit
    INTO v_plan, v_custom_limit
    FROM public.tenants
   WHERE id = NEW.tenant_id;

  v_limit := CASE v_plan
    WHEN 'basic'       THEN 1
    WHEN 'premium'     THEN 3
    WHEN 'enterprise'  THEN 10
    WHEN 'unlimited'   THEN 999999
    WHEN 'custom'      THEN COALESCE(v_custom_limit, 1)
    ELSE 1
  END;

  SELECT COUNT(*) INTO v_count
    FROM public.modules
   WHERE tenant_id = NEW.tenant_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'QUOTA_EXCEEDED: Your % plan allows % site(s). Please upgrade to add more.', v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_site_limit ON public.modules;
CREATE TRIGGER check_site_limit
  BEFORE INSERT ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_site_limit();

-- 3. Trigger process-action Edge Function when a pending action is inserted
CREATE OR REPLACE FUNCTION public.notify_process_action()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM extensions.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/process-action',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )::text,
    body    := jsonb_build_object('action_id', NEW.id)::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_process_action ON public.pending_actions;
CREATE TRIGGER trigger_process_action
  AFTER INSERT ON public.pending_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_process_action();

-- 4. Trigger process-batch-import when a batch import job is created
CREATE OR REPLACE FUNCTION public.notify_batch_import()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM extensions.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/process-batch-import',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )::text,
    body    := jsonb_build_object('import_id', NEW.id)::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_batch_import ON public.batch_imports;
CREATE TRIGGER trigger_batch_import
  AFTER INSERT ON public.batch_imports
  FOR EACH ROW EXECUTE FUNCTION public.notify_batch_import();

-- ============================================================
-- PG_CRON: 30-second orchestration loop
-- Two identical jobs offset by pg_sleep(30) achieve true 30s cadence.
--
-- BEFORE RUNNING: configure your Supabase project settings first:
--   ALTER DATABASE postgres SET app.supabase_url    = 'https://YOUR_REF.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
-- ============================================================

SELECT cron.unschedule('orchestrate-0s')  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'orchestrate-0s');
SELECT cron.unschedule('orchestrate-30s') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'orchestrate-30s');

SELECT cron.schedule(
  'orchestrate-0s',
  '* * * * *',
  $$
    SELECT extensions.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/orchestrate',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )::text,
      body    := '{}'
    );
  $$
);

SELECT cron.schedule(
  'orchestrate-30s',
  '* * * * *',
  $$
    SELECT pg_sleep(30);
    SELECT extensions.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/orchestrate',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )::text,
      body    := '{}'
    );
  $$
);
