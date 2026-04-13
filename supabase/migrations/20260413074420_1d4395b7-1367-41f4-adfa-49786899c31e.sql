-- Drop the overly permissive self-update policy
DROP POLICY IF EXISTS "Users can update own profile name" ON public.profiles;

-- Create a restricted self-update policy using a trigger to prevent sensitive field changes
CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user is an admin, allow all changes
  IF is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- For non-admin users updating their own profile, prevent changes to sensitive fields
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    RAISE EXCEPTION 'Cannot modify is_approved';
  END IF;
  IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN
    RAISE EXCEPTION 'Cannot modify employee_code';
  END IF;
  IF NEW.delegacion IS DISTINCT FROM OLD.delegacion THEN
    RAISE EXCEPTION 'Cannot modify delegacion';
  END IF;
  IF NEW.zone_id IS DISTINCT FROM OLD.zone_id THEN
    RAISE EXCEPTION 'Cannot modify zone_id';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot modify user_id';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS prevent_profile_self_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_self_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_self_escalation();

-- Re-create the self-update policy (still needed for RLS access)
CREATE POLICY "Users can update own profile name"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);