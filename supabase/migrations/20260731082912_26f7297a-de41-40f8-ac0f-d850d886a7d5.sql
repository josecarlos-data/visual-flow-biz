CREATE OR REPLACE FUNCTION public.ruta_clientes(_ruta text)
RETURNS TABLE(
  cod_cliente integer,
  cliente text,
  vendedor text,
  telefono text,
  localidad text,
  latitud numeric,
  longitud numeric,
  importe_actual numeric,
  importe_anterior_ytd numeric,
  dias_sin_comprar integer,
  ultima_compra date,
  ultima_visita date,
  situacion_etiqueta text,
  situacion_categoria text,
  situacion_efecto text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  s AS (SELECT * FROM public.situaciones_activas()),
  vis AS (
    SELECT v.cod_cliente, MAX(v.fecha) AS ultima FROM public.visitas v GROUP BY v.cod_cliente
  )
  SELECT c.cod_cliente, c.cliente, c.vendedor,
         COALESCE(NULLIF(c.telefono,''), NULLIF(c.telefono2,'')),
         c.localidad, c.latitud, c.longitud,
         COALESCE(k.importe_anio_actual, 0),
         COALESCE(k.importe_anio_anterior_ytd, 0),
         k.dias_sin_comprar, k.ultima_compra, v.ultima,
         s.etiqueta, s.categoria, s.efecto
  FROM public.clientes c
  JOIN p ON p.cod_cliente = c.cod_cliente
  LEFT JOIN public.cliente_kpis k ON k.cod_cliente = c.cod_cliente
  LEFT JOIN vis v ON v.cod_cliente = c.cod_cliente
  LEFT JOIN s ON s.cod_cliente = c.cod_cliente
  WHERE c.ruta = _ruta
  ORDER BY COALESCE(k.importe_anio_actual, 0) DESC, c.cliente
  LIMIT 2000;
$$;

REVOKE ALL ON FUNCTION public.ruta_clientes(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ruta_clientes(text) TO authenticated;