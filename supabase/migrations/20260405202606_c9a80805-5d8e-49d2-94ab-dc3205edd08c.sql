
-- 1. Trigger to prevent role escalation on profiles
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If role is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow if the current user is a manager or admin
    IF NOT is_manager_or_admin(auth.uid()) THEN
      -- Revert the role change silently
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_role_change_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_change();

-- 2. Add UPDATE and DELETE policies on lead_interactions for managers
CREATE POLICY "Managers can update interactions"
ON public.lead_interactions
FOR UPDATE
TO authenticated
USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can delete interactions"
ON public.lead_interactions
FOR DELETE
TO authenticated
USING (is_manager_or_admin(auth.uid()));
