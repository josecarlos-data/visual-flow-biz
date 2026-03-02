
CREATE OR REPLACE FUNCTION public.get_distinct_vendedores()
RETURNS TABLE(vendedor text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT DISTINCT c.vendedor FROM public.clientes c
  WHERE c.vendedor IS NOT NULL ORDER BY c.vendedor;
$$;

CREATE OR REPLACE FUNCTION public.get_distinct_delegaciones()
RETURNS TABLE(delegacion text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT DISTINCT c.delegacion FROM public.clientes c
  WHERE c.delegacion IS NOT NULL ORDER BY c.delegacion;
$$;
