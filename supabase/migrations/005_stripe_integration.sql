-- ============================================================
-- NeatHealer — Stripe Integration Migration v5
-- Adds Stripe tracking columns to tenants table
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT;

-- Index for fast lookups during webhooks
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id ON public.tenants(stripe_customer_id);

COMMENT ON COLUMN public.tenants.stripe_customer_id IS 'Unique ID from Stripe for the customer';
COMMENT ON COLUMN public.tenants.stripe_subscription_id IS 'ID of the active Stripe subscription';
COMMENT ON COLUMN public.tenants.subscription_status IS 'Current state of the subscription (active, trialing, canceled, etc.)';
