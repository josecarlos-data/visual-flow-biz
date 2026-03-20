
-- Helper functions for role-based RLS
CREATE OR REPLACE FUNCTION public.get_user_employee_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_code FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_delegacion(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT delegacion FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Fix RPC functions: add approval check
CREATE OR REPLACE FUNCTION public.get_distinct_vendedores()
RETURNS TABLE(vendedor text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.is_approved(auth.uid()) THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT DISTINCT c.vendedor FROM public.clientes c
    WHERE c.vendedor IS NOT NULL ORDER BY c.vendedor;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_distinct_delegaciones()
RETURNS TABLE(delegacion text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.is_approved(auth.uid()) THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT DISTINCT c.delegacion FROM public.clientes c
    WHERE c.delegacion IS NOT NULL ORDER BY c.delegacion;
END;
$$;

-- Replace SELECT policies on clientes with role-scoped policy
DROP POLICY IF EXISTS "Approved users can view clientes" ON public.clientes;
CREATE POLICY "Role-scoped view clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (
    is_approved(auth.uid()) AND (
      is_admin(auth.uid())
      OR has_role(auth.uid(), 'director_comercial')
      OR (has_role(auth.uid(), 'jefe_de_zona') AND delegacion = get_user_delegacion(auth.uid()))
      OR (has_role(auth.uid(), 'comercial') AND vendedor = get_user_employee_code(auth.uid()))
    )
  );

-- Replace SELECT policies on ventas_mensuales with role-scoped policy
DROP POLICY IF EXISTS "Approved users can view ventas" ON public.ventas_mensuales;
CREATE POLICY "Role-scoped view ventas_mensuales" ON public.ventas_mensuales
  FOR SELECT TO authenticated
  USING (
    is_approved(auth.uid()) AND (
      is_admin(auth.uid())
      OR has_role(auth.uid(), 'director_comercial')
      OR (has_role(auth.uid(), 'jefe_de_zona') AND cod_cliente IN (
        SELECT c.cod_cliente FROM public.clientes c WHERE c.delegacion = get_user_delegacion(auth.uid())
      ))
      OR (has_role(auth.uid(), 'comercial') AND cod_cliente IN (
        SELECT c.cod_cliente FROM public.clientes c WHERE c.vendedor = get_user_employee_code(auth.uid())
      ))
    )
  );

-- Replace SELECT policies on detalle_ventas with role-scoped policy
DROP POLICY IF EXISTS "Approved users can view detalle_ventas" ON public.detalle_ventas;
CREATE POLICY "Role-scoped view detalle_ventas" ON public.detalle_ventas
  FOR SELECT TO authenticated
  USING (
    is_approved(auth.uid()) AND (
      is_admin(auth.uid())
      OR has_role(auth.uid(), 'director_comercial')
      OR (has_role(auth.uid(), 'jefe_de_zona') AND cod_cliente IN (
        SELECT c.cod_cliente FROM public.clientes c WHERE c.delegacion = get_user_delegacion(auth.uid())
      ))
      OR (has_role(auth.uid(), 'comercial') AND vendedor = get_user_employee_code(auth.uid()))
    )
  );
