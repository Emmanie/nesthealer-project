-- ============================================================
-- NeatHealer — Phase 2 DB Migration (DeepSeek Features)
-- Run in: Supabase SQL Editor
-- ============================================================

-- 1. Playbooks (Human override rules)
CREATE TABLE IF NOT EXISTS public.playbooks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name           TEXT        NOT NULL,
  conditions     JSONB       NOT NULL DEFAULT '{}',
  action_type    TEXT        NOT NULL CHECK (action_type IN ('repair','restart','rollback','kill','ignore','notify')),
  priority       INT         NOT NULL DEFAULT 0,
  enabled        BOOLEAN     DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Outgoing Webhooks (Zapier/Custom triggers)
CREATE TABLE IF NOT EXISTS public.outgoing_webhooks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name           TEXT        NOT NULL,
  url            TEXT        NOT NULL,
  events         TEXT[]      DEFAULT '{}',
  active         BOOLEAN     DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Action Feedback (Thumbs up/down on AI decisions)
CREATE TABLE IF NOT EXISTS public.action_feedback (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  module_id      UUID        REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  action_log_id  UUID        REFERENCES public.pending_actions(id) ON DELETE CASCADE NOT NULL,
  feedback       BOOLEAN     NOT NULL, -- true = useful, false = bad
  comment        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_playbooks_tenant_id         ON public.playbooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id          ON public.outgoing_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_id          ON public.action_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_action_log_id      ON public.action_feedback(action_log_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.playbooks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outgoing_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_feedback   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playbooks_own" ON public.playbooks;
DROP POLICY IF EXISTS "webhooks_own"  ON public.outgoing_webhooks;
DROP POLICY IF EXISTS "feedback_own"  ON public.action_feedback;

CREATE POLICY "playbooks_own" ON public.playbooks
  FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));

CREATE POLICY "webhooks_own" ON public.outgoing_webhooks
  FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));

CREATE POLICY "feedback_own" ON public.action_feedback
  FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));

-- ============================================================
-- PG_CRON: Weekly Report (Mondays at 08:00)
-- ============================================================
SELECT cron.unschedule('weekly-report') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-report');

SELECT cron.schedule(
  'weekly-report',
  '0 8 * * 1', -- Every Monday at 08:00
  $$
    SELECT extensions.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/weekly-report',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )::text,
      body    := '{}'
    );
  $$
);
