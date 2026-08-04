-- ========== FASE 0 ==========
DO $$
DECLARE n bigint;
BEGIN
  SELECT (SELECT count(*) FROM public.ventas_mensuales)
       + (SELECT count(*) FROM public.detalle_ventas)
       + (SELECT count(*) FROM public.cliente_productos) INTO n;
  IF n <> 0 THEN
    RAISE EXCEPTION 'Abortado: las tablas a eliminar contienen % filas', n;
  END IF;
END $$;

ALTER TABLE public.cliente_kpis
  ADD COLUMN IF NOT EXISTS dias_activos_ultimo_ano integer;

CREATE OR REPLACE FUNCTION public.refrescar_resumenes_ventas()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max date; v_anio integer; v_mes integer; v_dia integer;
BEGIN
  SET LOCAL statement_timeout = '300s';

  SELECT COALESCE(max(fecha), CURRENT_DATE) INTO v_max FROM public.ventas_diarias;
  v_anio := EXTRACT(YEAR FROM v_max)::int;
  v_mes := EXTRACT(MONTH FROM v_max)::int;
  v_dia := EXTRACT(DAY FROM v_max)::int;

  TRUNCATE public.resumen_cliente_mes;
  INSERT INTO public.resumen_cliente_mes (cod_cliente, anio, mes, importe, margen, unidades, lineas)
  SELECT cod_cliente, EXTRACT(YEAR FROM fecha)::int, EXTRACT(MONTH FROM fecha)::int,
         SUM(importe), SUM(margen), SUM(unidades), COUNT(*)
  FROM public.ventas_diarias GROUP BY 1,2,3;

  TRUNCATE public.resumen_cliente_familia;
  INSERT INTO public.resumen_cliente_familia (cod_cliente, anio, familia, importe, margen, unidades, ultima_compra)
  SELECT cod_cliente, EXTRACT(YEAR FROM fecha)::int, COALESCE(NULLIF(familia,''),'SIN'), SUM(importe), SUM(margen), SUM(unidades), MAX(fecha)
  FROM public.ventas_diarias GROUP BY 1,2,3;

  TRUNCATE public.resumen_cliente_marca;
  INSERT INTO public.resumen_cliente_marca (cod_cliente, anio, marca, importe, margen, unidades)
  SELECT cod_cliente, EXTRACT(YEAR FROM fecha)::int, COALESCE(NULLIF(marca,''),'SIN'), SUM(importe), SUM(margen), SUM(unidades)
  FROM public.ventas_diarias GROUP BY 1,2,3;

  TRUNCATE public.resumen_documentos;
  INSERT INTO public.resumen_documentos (cod_cliente, anio, mes, canal, documentos, abonos, importe, importe_abonos, margen, unidades, lineas)
  SELECT cod_cliente, EXTRACT(YEAR FROM fecha)::int, EXTRACT(MONTH FROM fecha)::int,
         COALESCE(NULLIF(canal,''),'SIN'),
         COUNT(DISTINCT id_documento) FILTER (WHERE COALESCE(operacion,'Venta') <> 'Abono'),
         COUNT(DISTINCT id_documento) FILTER (WHERE operacion = 'Abono'),
         SUM(importe),
         COALESCE(SUM(importe) FILTER (WHERE operacion = 'Abono'), 0),
         SUM(margen), SUM(unidades), COUNT(*)
  FROM public.ventas_diarias GROUP BY 1,2,3,4;

  TRUNCATE public.cliente_kpis;
  INSERT INTO public.cliente_kpis (cod_cliente, primera_compra, ultima_compra, dias_sin_comprar, num_referencias, num_lineas,
    importe_total, margen_total, importe_anio_actual, margen_anio_actual, importe_anio_anterior, margen_anio_anterior, importe_anio_anterior_ytd,
    num_documentos_actual, num_documentos_anterior, ticket_medio_actual, ticket_medio_anterior,
    lineas_por_documento, frecuencia_compra_dias, num_abonos, importe_abonos, canal_principal, dias_activos_ultimo_ano)
  WITH base AS (
    SELECT cod_cliente, MIN(fecha) AS primera, MAX(fecha) AS ultima,
      COUNT(DISTINCT referencia) AS refs, COUNT(*) AS lineas,
      SUM(importe) AS importe_total, SUM(margen) AS margen_total,
      COALESCE(SUM(importe) FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio),0) AS imp_act,
      COALESCE(SUM(margen)  FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio),0) AS mar_act,
      COALESCE(SUM(importe) FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio - 1),0) AS imp_ant,
      COALESCE(SUM(margen)  FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio - 1),0) AS mar_ant,
      COALESCE(SUM(importe) FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio - 1
        AND (EXTRACT(MONTH FROM fecha)::int < v_mes
          OR (EXTRACT(MONTH FROM fecha)::int = v_mes AND EXTRACT(DAY FROM fecha)::int <= v_dia))),0) AS imp_ant_ytd,
      COUNT(DISTINCT id_documento) FILTER (WHERE COALESCE(operacion,'Venta') <> 'Abono' AND EXTRACT(YEAR FROM fecha)::int = v_anio) AS docs_act,
      COUNT(DISTINCT id_documento) FILTER (WHERE COALESCE(operacion,'Venta') <> 'Abono' AND EXTRACT(YEAR FROM fecha)::int = v_anio - 1) AS docs_ant,
      COUNT(DISTINCT id_documento) FILTER (WHERE COALESCE(operacion,'Venta') <> 'Abono') AS docs_tot,
      COUNT(DISTINCT id_documento) FILTER (WHERE operacion = 'Abono') AS abonos,
      COALESCE(SUM(importe) FILTER (WHERE operacion = 'Abono'),0) AS imp_abonos,
      COUNT(DISTINCT fecha) FILTER (WHERE fecha > v_max - 365) AS dias_act_ano
    FROM public.ventas_diarias GROUP BY cod_cliente
  ), canal AS (
    SELECT DISTINCT ON (cod_cliente) cod_cliente, COALESCE(NULLIF(canal,''),'SIN') AS canal
    FROM public.ventas_diarias GROUP BY cod_cliente, COALESCE(NULLIF(canal,''),'SIN')
    ORDER BY cod_cliente, SUM(importe) DESC
  )
  SELECT b.cod_cliente, b.primera, b.ultima, (v_max - b.ultima)::int, b.refs, b.lineas,
    b.importe_total, b.margen_total, b.imp_act, b.mar_act, b.imp_ant, b.mar_ant, b.imp_ant_ytd,
    b.docs_act, b.docs_ant,
    CASE WHEN b.docs_act > 0 THEN ROUND(b.imp_act / b.docs_act, 2) ELSE 0 END,
    CASE WHEN b.docs_ant > 0 THEN ROUND(b.imp_ant / b.docs_ant, 2) ELSE 0 END,
    CASE WHEN b.docs_tot > 0 THEN ROUND(b.lineas::numeric / b.docs_tot, 2) ELSE 0 END,
    CASE WHEN b.dias_act_ano > 0 THEN ROUND(365.0 / b.dias_act_ano, 1) ELSE NULL END,
    b.abonos, b.imp_abonos, c.canal,
    NULLIF(b.dias_act_ano, 0)::int
  FROM base b LEFT JOIN canal c ON c.cod_cliente = b.cod_cliente;
END; $function$;

DROP TABLE IF EXISTS public.cliente_productos;
DROP TABLE IF EXISTS public.detalle_ventas;
DROP TABLE IF EXISTS public.ventas_mensuales;

-- ========== FASE 1 ==========
ALTER TABLE public.visitas
  ADD COLUMN IF NOT EXISTS resultado_visita text,
  ADD COLUMN IF NOT EXISTS visita_origen_id uuid REFERENCES public.visitas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_registro timestamptz NOT NULL DEFAULT now();

UPDATE public.visitas SET resultado_visita = 'desconocido' WHERE resultado_visita IS NULL;

ALTER TABLE public.visitas
  ALTER COLUMN resultado_visita SET DEFAULT 'efectiva',
  ALTER COLUMN resultado_visita SET NOT NULL;

ALTER TABLE public.visitas DROP CONSTRAINT IF EXISTS visitas_resultado_chk;
ALTER TABLE public.visitas
  ADD CONSTRAINT visitas_resultado_chk
  CHECK (resultado_visita IN ('efectiva','cliente_ausente','cerrado','sin_acceso','desconocido'));

UPDATE public.visitas SET tipo = lower(trim(tipo)) WHERE tipo IS NOT NULL AND tipo <> lower(trim(tipo));
UPDATE public.visitas SET tipo = 'cliente' WHERE tipo IS NULL OR tipo NOT IN ('cliente','ruta','llamada','agenda');

ALTER TABLE public.visitas DROP CONSTRAINT IF EXISTS visitas_tipo_chk;
ALTER TABLE public.visitas
  ALTER COLUMN tipo SET DEFAULT 'cliente',
  ADD CONSTRAINT visitas_tipo_chk
  CHECK (tipo IN ('cliente','ruta','llamada','agenda'));

CREATE INDEX IF NOT EXISTS idx_visitas_origen_id ON public.visitas(visita_origen_id);

ALTER TABLE public.visitas DROP CONSTRAINT IF EXISTS visitas_cod_cliente_fk;
ALTER TABLE public.visitas
  ADD CONSTRAINT visitas_cod_cliente_fk
  FOREIGN KEY (cod_cliente) REFERENCES public.clientes(cod_cliente) NOT VALID;

DO $$
DECLARE n int; m int;
BEGIN
  SELECT count(*) INTO n FROM public.visitas v
  LEFT JOIN public.clientes c USING (cod_cliente)
  WHERE v.cod_cliente IS NOT NULL AND c.cod_cliente IS NULL;
  IF n = 0 THEN
    ALTER TABLE public.visitas VALIDATE CONSTRAINT visitas_cod_cliente_fk;
  ELSE
    RAISE NOTICE 'FK dejada NOT VALID: % visitas con cliente inexistente', n;
  END IF;

  SELECT count(*) INTO m FROM public.visitas
  WHERE COALESCE(trim(observaciones),'') = '';
  RAISE NOTICE 'Visitas sin observaciones (posibles no realizadas): %', m;
END $$;