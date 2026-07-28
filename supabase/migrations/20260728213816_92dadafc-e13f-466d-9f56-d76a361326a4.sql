GRANT EXECUTE ON FUNCTION public.can_view_cliente(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refrescar_resumenes_ventas() TO service_role;