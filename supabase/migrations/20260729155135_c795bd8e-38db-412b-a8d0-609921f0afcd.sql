CREATE OR REPLACE FUNCTION public.reset_maestro_isi_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  TRUNCATE TABLE
    public.cliente_insights,
    public.cliente_productos,
    public.cliente_kpis,
    public.resumen_cliente_mes,
    public.resumen_cliente_familia,
    public.resumen_cliente_marca,
    public.ventas_diarias,
    public.detalle_ventas,
    public.ventas_mensuales,
    public.productos,
    public.clientes;
END;
$function$;