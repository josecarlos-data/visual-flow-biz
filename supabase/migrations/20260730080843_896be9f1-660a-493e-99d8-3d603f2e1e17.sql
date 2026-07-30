ALTER TABLE public.situaciones_cliente
  ADD COLUMN IF NOT EXISTS efecto text NOT NULL DEFAULT 'ocultar';

ALTER TABLE public.situaciones_cliente
  DROP CONSTRAINT IF EXISTS situaciones_cliente_efecto_check;
ALTER TABLE public.situaciones_cliente
  ADD CONSTRAINT situaciones_cliente_efecto_check
  CHECK (efecto IN ('ocultar','justificada','informativa'));

DROP FUNCTION IF EXISTS public.panel_alertas(integer, boolean);
DROP FUNCTION IF EXISTS public.panel_dormidos(integer, boolean);
DROP FUNCTION IF EXISTS public.situaciones_activas();
CREATE OR REPLACE FUNCTION public.situaciones_activas()
 RETURNS TABLE(cod_cliente integer, etiqueta text, categoria text, nota text, efecto text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (s.cod_cliente) s.cod_cliente, s.etiqueta, s.categoria, s.nota, s.efecto
  FROM public.situaciones_cliente s
  WHERE s.activo
    AND s.desde <= CURRENT_DATE
    AND (s.hasta IS NULL OR s.hasta >= CURRENT_DATE)
  ORDER BY s.cod_cliente, s.updated_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.panel_alertas(_limite integer DEFAULT 15, _incluir_excluidos boolean DEFAULT false)
 RETURNS TABLE(tipo text, cod_cliente integer, cliente text, vendedor text, valor numeric, valor_ref numeric, dias integer, etiqueta text, situacion_categoria text, situacion_efecto text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  s AS (SELECT * FROM public.situaciones_activas()),
  k AS (
    SELECT k.*, COALESCE(c.cliente, 'Cliente ' || k.cod_cliente) AS nombre, c.vendedor,
           s.etiqueta AS etiqueta, s.categoria AS situacion_categoria, s.efecto AS situacion_efecto
    FROM public.cliente_kpis k
    JOIN p ON p.cod_cliente = k.cod_cliente
    LEFT JOIN public.clientes c ON c.cod_cliente = k.cod_cliente
    LEFT JOIN s ON s.cod_cliente = k.cod_cliente
    WHERE _incluir_excluidos OR COALESCE(s.efecto, 'ninguno') <> 'ocultar'
  )
  (SELECT 'caida', cod_cliente, nombre, vendedor, importe_anio_actual, importe_anio_anterior_ytd, dias_sin_comprar, etiqueta, situacion_categoria, situacion_efecto
   FROM k WHERE importe_anio_anterior_ytd > 1000 AND importe_anio_actual < importe_anio_anterior_ytd * 0.8
   ORDER BY (importe_anio_anterior_ytd - importe_anio_actual) DESC LIMIT GREATEST(1, LEAST(_limite, 50)))
  UNION ALL
  (SELECT 'fuga', cod_cliente, nombre, vendedor, importe_total, importe_anio_anterior, dias_sin_comprar, etiqueta, situacion_categoria, situacion_efecto
   FROM k WHERE dias_sin_comprar > 90 AND importe_total > 1000
   ORDER BY importe_anio_anterior DESC LIMIT GREATEST(1, LEAST(_limite, 50)))
  UNION ALL
  (SELECT 'margen_bajo', cod_cliente, nombre, vendedor, importe_anio_actual,
          CASE WHEN importe_anio_actual > 0 THEN margen_anio_actual / importe_anio_actual * 100 ELSE 0 END, dias_sin_comprar, etiqueta, situacion_categoria, situacion_efecto
   FROM k WHERE public.puede_ver_margen(auth.uid()) AND importe_anio_actual > 5000
     AND margen_anio_actual / NULLIF(importe_anio_actual,0) < 0.20
   ORDER BY importe_anio_actual DESC LIMIT GREATEST(1, LEAST(_limite, 50)));
$function$;

CREATE OR REPLACE FUNCTION public.panel_dormidos(_limite integer DEFAULT 25, _incluir_excluidos boolean DEFAULT false)
 RETURNS TABLE(cod_cliente integer, cliente text, vendedor text, ultima_compra date, importe_total numeric, etiqueta text, situacion_efecto text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  s AS (SELECT * FROM public.situaciones_activas())
  SELECT c.cod_cliente, c.cliente, c.vendedor, k.ultima_compra, COALESCE(k.importe_total, 0), s.etiqueta, s.efecto
  FROM public.clientes c
  JOIN p ON p.cod_cliente = c.cod_cliente
  LEFT JOIN public.cliente_kpis k ON k.cod_cliente = c.cod_cliente
  LEFT JOIN s ON s.cod_cliente = c.cod_cliente
  WHERE (k.cod_cliente IS NULL OR k.dias_sin_comprar > 365)
    AND (_incluir_excluidos OR COALESCE(s.efecto,'ninguno') <> 'ocultar')
  ORDER BY COALESCE(k.importe_total, 0) DESC, c.cliente
  LIMIT GREATEST(1, LEAST(_limite, 200));
$function$;

REVOKE ALL ON FUNCTION public.situaciones_activas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.panel_alertas(integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_dormidos(integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.situaciones_activas() TO authenticated;