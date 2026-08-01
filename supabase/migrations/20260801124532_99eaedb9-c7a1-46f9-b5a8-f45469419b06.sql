ALTER FUNCTION public.quincena_de(date) SET search_path TO 'public';

REVOKE ALL ON FUNCTION public.quincena_de(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fecha_corte_datos() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quincena_corte(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.objetivos_seguimiento(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.objetivos_propuesta(integer, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vendedores_objetivos() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.quincena_de(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fecha_corte_datos() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.quincena_corte(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.objetivos_seguimiento(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.objetivos_propuesta(integer, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vendedores_objetivos() TO authenticated, service_role;