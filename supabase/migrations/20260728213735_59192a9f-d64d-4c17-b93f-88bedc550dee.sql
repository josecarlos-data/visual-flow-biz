REVOKE ALL ON FUNCTION public.can_view_cliente(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refrescar_resumenes_ventas() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.puede_ver_margen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_ver_margen(uuid) TO authenticated;