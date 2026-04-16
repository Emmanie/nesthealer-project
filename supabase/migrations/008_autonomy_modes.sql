-- ============================================================
-- NeatHealer — Intelligent Autonomy Modes v8
-- Adds Advisor, Guardian, and Surgeon tiers per site.
-- ============================================================

-- Add the autonomy_level column
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS autonomy_level TEXT NOT NULL DEFAULT 'guardian'
  CHECK (autonomy_level IN ('advisor', 'guardian', 'surgeon'));

-- Trigger to prevent 'surgeon' mode on Basic plans
CREATE OR REPLACE FUNCTION public.enforce_surgeon_plan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan INTO v_plan FROM public.tenants WHERE id = NEW.tenant_id;

  IF NEW.autonomy_level = 'surgeon' AND v_plan = 'basic' THEN
    RAISE EXCEPTION 'PLAN_RESTRICTED: Surgeon mode is reserved for Premium and Enterprise users. Please upgrade your plan.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_surgeon_plan_insert ON public.modules;
CREATE TRIGGER check_surgeon_plan_insert
  BEFORE INSERT ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_surgeon_plan();

DROP TRIGGER IF EXISTS check_surgeon_plan_update ON public.modules;
CREATE TRIGGER check_surgeon_plan_update
  BEFORE UPDATE OF autonomy_level ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_surgeon_plan();

COMMENT ON COLUMN public.modules.autonomy_level IS 'AI intervention level: advisor (alert only), guardian (auto restarts), surgeon (auto SQL).';
