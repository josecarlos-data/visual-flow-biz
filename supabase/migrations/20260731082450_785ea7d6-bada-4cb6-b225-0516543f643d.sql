ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS latitud numeric,
  ADD COLUMN IF NOT EXISTS longitud numeric;

CREATE INDEX IF NOT EXISTS idx_clientes_ruta ON public.clientes (ruta);

-- Siembra/actualiza coordenadas de clientes a partir de las visitas geolocalizadas
CREATE OR REPLACE FUNCTION public.sembrar_geo_clientes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  WITH ult AS (
    SELECT DISTINCT ON (v.cod_cliente) v.cod_cliente, v.latitud, v.longitud
    FROM public.visitas v
    WHERE v.cod_cliente IS NOT NULL AND v.latitud IS NOT NULL AND v.longitud IS NOT NULL
      AND v.latitud BETWEEN -90 AND 90 AND v.longitud BETWEEN -180 AND 180
    ORDER BY v.cod_cliente, v.fecha DESC, v.hora DESC NULLS LAST
  )
  UPDATE public.clientes c
     SET latitud = u.latitud, longitud = u.longitud, updated_at = now()
    FROM ult u
   WHERE u.cod_cliente = c.cod_cliente
     AND (c.latitud IS NULL OR c.longitud IS NULL);
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;

REVOKE ALL ON FUNCTION public.sembrar_geo_clientes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sembrar_geo_clientes() TO authenticated;

-- Rutas visibles para el usuario actual
CREATE OR REPLACE FUNCTION public.rutas_visibles()
RETURNS TABLE(
  ruta text,
  clientes integer,
  clientes_activos integer,
  con_geo integer,
  importe_actual numeric,
  importe_anterior_ytd numeric,
  sin_visitar integer,
  ultima_visita date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  base AS (
    SELECT c.cod_cliente, c.ruta, c.latitud, c.longitud,
           COALESCE(k.importe_anio_actual, 0) AS imp_act,
           COALESCE(k.importe_anio_anterior_ytd, 0) AS imp_ant,
           k.dias_sin_comprar
    FROM public.clientes c
    JOIN p ON p.cod_cliente = c.cod_cliente
    LEFT JOIN public.cliente_kpis k ON k.cod_cliente = c.cod_cliente
    WHERE c.ruta IS NOT NULL AND c.ruta <> ''
  ),
  vis AS (
    SELECT v.cod_cliente, MAX(v.fecha) AS ultima
    FROM public.visitas v
    JOIN p ON p.cod_cliente = v.cod_cliente
    GROUP BY v.cod_cliente
  )
  SELECT b.ruta,
         COUNT(*)::int,
         COUNT(*) FILTER (WHERE b.dias_sin_comprar IS NOT NULL AND b.dias_sin_comprar <= 1095)::int,
         COUNT(*) FILTER (WHERE b.latitud IS NOT NULL AND b.longitud IS NOT NULL)::int,
         SUM(b.imp_act),
         SUM(b.imp_ant),
         COUNT(*) FILTER (WHERE v.ultima IS NULL OR v.ultima < CURRENT_DATE - 90)::int,
         MAX(v.ultima)
  FROM base b
  LEFT JOIN vis v ON v.cod_cliente = b.cod_cliente
  GROUP BY b.ruta
  ORDER BY SUM(b.imp_act) DESC, b.ruta;
$$;

REVOKE ALL ON FUNCTION public.rutas_visibles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rutas_visibles() TO authenticated;

-- Clientes de una ruta concreta
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
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.ruta_clientes(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ruta_clientes(text) TO authenticated;