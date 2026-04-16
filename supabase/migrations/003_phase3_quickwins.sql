-- NeatHealer Phase 3 Quick Wins Migration
-- Executed via Supabase SQL Editor

-- 1. Enable Public Status Pages per Tenant
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS public_status_page BOOLEAN DEFAULT false;

-- 2. Allow actual Restart / Deployment Webhooks per site
ALTER TABLE public.modules
ADD COLUMN IF NOT EXISTS cloud_restart_hook TEXT;

-- (No complex RLS changes needed! Server-Side Next.js will retrieve the data securely)
