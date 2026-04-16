-- NeatHealer Phase 3 - Supabase Connector Expansion
-- Migration: 004_supabase_connector.sql

-- 1. Add connection columns to modules
ALTER TABLE public.modules
ADD COLUMN IF NOT EXISTS supabase_access_level TEXT DEFAULT 'none' 
CHECK (supabase_access_level IN ('none', 'anon', 'service', 'custom')),
ADD COLUMN IF NOT EXISTS encrypted_supabase_url TEXT,
ADD COLUMN IF NOT EXISTS encrypted_supabase_key TEXT,
ADD COLUMN IF NOT EXISTS supabase_iv TEXT,
ADD COLUMN IF NOT EXISTS supabase_tag TEXT,
ADD COLUMN IF NOT EXISTS supabase_terms_accepted BOOLEAN DEFAULT false;

-- 2. Add comment for clarity
COMMENT ON COLUMN public.modules.encrypted_supabase_key IS 'AES-256-GCM encrypted Service Role or Anon key for the client project';
