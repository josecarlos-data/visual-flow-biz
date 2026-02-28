
-- Fix: Change restrictive SELECT policies on profiles to permissive
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Directors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Jefes can view zone profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Directors can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'director_comercial'::app_role));

CREATE POLICY "Jefes can view zone profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'jefe_de_zona'::app_role) AND zone_id = get_user_zone_id(auth.uid()));

-- Also fix user_roles SELECT policy
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
