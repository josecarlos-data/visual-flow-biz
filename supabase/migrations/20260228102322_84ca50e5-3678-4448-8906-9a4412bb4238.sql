
-- =============================================
-- Convert ALL RLS policies to PERMISSIVE
-- =============================================

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Directors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Jefes can view zone profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile name" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Directors can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'director_comercial'::app_role));
CREATE POLICY "Jefes can view zone profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'jefe_de_zona'::app_role) AND zone_id = get_user_zone_id(auth.uid()));
CREATE POLICY "Admins can update all profiles" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can update own profile name" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can delete profiles" ON public.profiles AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- CLIENTES
DROP POLICY IF EXISTS "Approved users can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;

CREATE POLICY "Approved users can view clientes" ON public.clientes AS PERMISSIVE FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Admins can insert clientes" ON public.clientes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update clientes" ON public.clientes AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete clientes" ON public.clientes AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- DETALLE_VENTAS
DROP POLICY IF EXISTS "Approved users can view detalle_ventas" ON public.detalle_ventas;
DROP POLICY IF EXISTS "Admins can insert detalle_ventas" ON public.detalle_ventas;
DROP POLICY IF EXISTS "Admins can update detalle_ventas" ON public.detalle_ventas;
DROP POLICY IF EXISTS "Admins can delete detalle_ventas" ON public.detalle_ventas;

CREATE POLICY "Approved users can view detalle_ventas" ON public.detalle_ventas AS PERMISSIVE FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Admins can insert detalle_ventas" ON public.detalle_ventas AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update detalle_ventas" ON public.detalle_ventas AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete detalle_ventas" ON public.detalle_ventas AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- VENTAS_MENSUALES
DROP POLICY IF EXISTS "Approved users can view ventas" ON public.ventas_mensuales;
DROP POLICY IF EXISTS "Admins can insert ventas" ON public.ventas_mensuales;
DROP POLICY IF EXISTS "Admins can update ventas" ON public.ventas_mensuales;
DROP POLICY IF EXISTS "Admins can delete ventas" ON public.ventas_mensuales;

CREATE POLICY "Approved users can view ventas" ON public.ventas_mensuales AS PERMISSIVE FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Admins can insert ventas" ON public.ventas_mensuales AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update ventas" ON public.ventas_mensuales AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete ventas" ON public.ventas_mensuales AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- ZONES
DROP POLICY IF EXISTS "Approved users can view zones" ON public.zones;
DROP POLICY IF EXISTS "Admins manage zones" ON public.zones;

CREATE POLICY "Approved users can view zones" ON public.zones AS PERMISSIVE FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Admins manage zones" ON public.zones AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
