CREATE OR REPLACE FUNCTION public.cliente_top_productos(_cod integer, _anio integer DEFAULT NULL)
RETURNS TABLE(referencia text, descripcion text, familia text, marca text, unidades numeric, importe numeric, margen numeric, ultima_compra date)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_view_cliente(auth.uid(), _cod) THEN RETURN; END IF;
  RETURN QUERY
  SELECT v.referencia,
         p.descripcion,
         COALESCE(p.familia_nombre, p.familia, v.familia),
         COALESCE(p.marca_nombre, p.marca, v.marca),
         SUM(v.unidades),
         SUM(v.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(v.margen) ELSE 0 END,
         MAX(v.fecha)
  FROM public.ventas_diarias v
  LEFT JOIN public.productos p ON p.referencia = v.referencia
  WHERE v.cod_cliente = _cod
    AND (_anio IS NULL OR EXTRACT(YEAR FROM v.fecha)::int = _anio)
  GROUP BY v.referencia, p.descripcion, COALESCE(p.familia_nombre, p.familia, v.familia), COALESCE(p.marca_nombre, p.marca, v.marca)
  ORDER BY SUM(v.importe) DESC
  LIMIT 500;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cliente_top_productos(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_top_productos(integer, integer) TO authenticated;