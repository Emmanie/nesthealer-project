-- ============================================================
-- NeatHealer — AI Surgeon Schema v6
-- Adds proposed_sql for AI repairs and validation status
-- ============================================================

-- Add the proposed_sql column
ALTER TABLE public.pending_actions
  ADD COLUMN IF NOT EXISTS proposed_sql TEXT;

-- Update the status check constraint to include 'pending_approval'
-- Note: We drop the constraint only if it exists (by name, often generated)
DO $$ 
BEGIN 
  ALTER TABLE public.pending_actions DROP CONSTRAINT IF EXISTS pending_actions_status_check;
EXCEPTION 
  WHEN undefined_object THEN NULL; 
END $$;

ALTER TABLE public.pending_actions
  ADD CONSTRAINT pending_actions_status_check 
  CHECK (status IN ('pending', 'pending_approval', 'processing', 'done', 'failed'));

-- NEW: Trigger process-action on UPDATE (to catch manual approvals)
DROP TRIGGER IF EXISTS trigger_process_action_update ON public.pending_actions;
CREATE TRIGGER trigger_process_action_update
  AFTER UPDATE OF status ON public.pending_actions
  FOR EACH ROW
  WHEN (OLD.status = 'pending_approval' AND NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_process_action();

COMMENT ON COLUMN public.pending_actions.proposed_sql IS 'The SQL query suggested by the AI to repair the database.';
COMMENT ON COLUMN public.pending_actions.status IS 'pending_approval is used for AI Surgeon suggestions requiring human review.';
