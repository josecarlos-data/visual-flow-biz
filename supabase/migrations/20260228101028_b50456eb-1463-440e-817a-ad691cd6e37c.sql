-- Fix auth gating: convert overlapping profile/role policies to PERMISSIVE

-- PROFILES (SELECT)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Directors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Jefes can view zone profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Directors can view all profiles"
  ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'director_comercial'::app_role));

CREATE POLICY "Jefes can view zone profiles"
  ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'jefe_de_zona'::app_role)
    AND zone_id = get_user_zone_id(auth.uid())
  );

-- PROFILES (UPDATE)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile name" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can update own profile name"
  ON public.profiles
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USER_ROLES (SELECT/ALL)
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
  ON public.user_roles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles"
  ON public.user_roles
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));