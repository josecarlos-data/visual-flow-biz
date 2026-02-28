-- Fix remaining RESTRICTIVE policies on other tables to be PERMISSIVE + scoped to authenticated

-- CLIENTES
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Approved users can view clientes" ON public.clientes;

CREATE POLICY "Admins can delete clientes" ON public.clientes AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert clientes" ON public.clientes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update clientes" ON public.clientes AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Approved users can view clientes" ON public.clientes AS PERMISSIVE FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- DETALLE_VENTAS
DROP POLICY IF EXISTS "Admins can delete detalle_ventas" ON public.detalle_ventas;
DROP POLICY IF EXISTS "Admins can insert detalle_ventas" ON public.detalle_ventas;
DROP POLICY IF EXISTS "Admins can update detalle_ventas" ON public.detalle_ventas;
DROP POLICY IF EXISTS "Approved users can view detalle_ventas" ON public.detalle_ventas;

CREATE POLICY "Admins can delete detalle_ventas" ON public.detalle_ventas AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert detalle_ventas" ON public.detalle_ventas AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update detalle_ventas" ON public.detalle_ventas AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Approved users can view detalle_ventas" ON public.detalle_ventas AS PERMISSIVE FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- VENTAS_MENSUALES
DROP POLICY IF EXISTS "Admins can delete ventas" ON public.ventas_mensuales;
DROP POLICY IF EXISTS "Admins can insert ventas" ON public.ventas_mensuales;
DROP POLICY IF EXISTS "Admins can update ventas" ON public.ventas_mensuales;
DROP POLICY IF EXISTS "Approved users can view ventas" ON public.ventas_mensuales;

CREATE POLICY "Admins can delete ventas" ON public.ventas_mensuales AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert ventas" ON public.ventas_mensuales AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update ventas" ON public.ventas_mensuales AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Approved users can view ventas" ON public.ventas_mensuales AS PERMISSIVE FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- ZONES
DROP POLICY IF EXISTS "Admins manage zones" ON public.zones;
DROP POLICY IF EXISTS "Approved users can view zones" ON public.zones;

CREATE POLICY "Admins manage zones" ON public.zones AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Approved users can view zones" ON public.zones AS PERMISSIVE FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- PROFILES DELETE (was also restrictive)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin(auth.uid()));