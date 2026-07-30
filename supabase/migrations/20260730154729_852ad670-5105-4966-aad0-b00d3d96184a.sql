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
    lineas_por_documento, frecuencia_compra_dias, num_abonos, importe_abonos, canal_principal)
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
      COALESCE(SUM(importe) FILTER (WHERE operacion = 'Abono'),0) AS imp_abonos
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
    CASE WHEN b.docs_tot > 1 THEN ROUND((b.ultima - b.primera)::numeric / (b.docs_tot - 1), 1) ELSE NULL END,
    b.abonos, b.imp_abonos, c.canal
  FROM base b LEFT JOIN canal c ON c.cod_cliente = b.cod_cliente;
END; $function$;

DROP FUNCTION IF EXISTS public.panel_ventas_kpis();
DROP FUNCTION IF EXISTS public.panel_ventas_mensual();

CREATE OR REPLACE FUNCTION public.panel_ventas_kpis()
 RETURNS TABLE(anio integer, importe numeric, margen numeric, unidades numeric, clientes integer, lineas integer,
               documentos integer, abonos integer, importe_abonos numeric, ticket_medio numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  d AS (
    SELECT r.anio, SUM(r.documentos)::int AS documentos, SUM(r.abonos)::int AS abonos, SUM(r.importe_abonos) AS importe_abonos
    FROM public.resumen_documentos r JOIN p ON p.cod_cliente = r.cod_cliente GROUP BY r.anio
  )
  SELECT r.anio, SUM(r.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(r.margen) ELSE 0 END,
         SUM(r.unidades), COUNT(DISTINCT r.cod_cliente)::int, SUM(r.lineas)::int,
         COALESCE(d.documentos,0), COALESCE(d.abonos,0), COALESCE(d.importe_abonos,0),
         CASE WHEN COALESCE(d.documentos,0) > 0 THEN ROUND(SUM(r.importe) / d.documentos, 2) ELSE 0 END
  FROM public.resumen_cliente_mes r
  JOIN p ON p.cod_cliente = r.cod_cliente
  LEFT JOIN d ON d.anio = r.anio
  GROUP BY r.anio, d.documentos, d.abonos, d.importe_abonos
  ORDER BY r.anio;
$function$;

CREATE OR REPLACE FUNCTION public.panel_ventas_mensual()
 RETURNS TABLE(anio integer, mes integer, importe numeric, margen numeric, unidades numeric, documentos integer, ticket_medio numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  d AS (
    SELECT r.anio, r.mes, SUM(r.documentos)::int AS documentos
    FROM public.resumen_documentos r JOIN p ON p.cod_cliente = r.cod_cliente GROUP BY r.anio, r.mes
  )
  SELECT r.anio, r.mes, SUM(r.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(r.margen) ELSE 0 END,
         SUM(r.unidades), COALESCE(d.documentos,0),
         CASE WHEN COALESCE(d.documentos,0) > 0 THEN ROUND(SUM(r.importe) / d.documentos, 2) ELSE 0 END
  FROM public.resumen_cliente_mes r
  JOIN p ON p.cod_cliente = r.cod_cliente
  LEFT JOIN d ON d.anio = r.anio AND d.mes = r.mes
  GROUP BY r.anio, r.mes, d.documentos ORDER BY r.anio, r.mes;
$function$;

CREATE OR REPLACE FUNCTION public.panel_canales(_anio integer)
 RETURNS TABLE(canal text, documentos integer, importe numeric, margen numeric, ticket_medio numeric, clientes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid()))
  SELECT r.canal, SUM(r.documentos)::int, SUM(r.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(r.margen) ELSE 0 END,
         CASE WHEN SUM(r.documentos) > 0 THEN ROUND(SUM(r.importe) / SUM(r.documentos), 2) ELSE 0 END,
         COUNT(DISTINCT r.cod_cliente)::int
  FROM public.resumen_documentos r JOIN p ON p.cod_cliente = r.cod_cliente
  WHERE r.anio = _anio
  GROUP BY r.canal ORDER BY SUM(r.importe) DESC;
$function$;

CREATE OR REPLACE FUNCTION public.panel_devoluciones(_anio integer, _limite integer DEFAULT 10)
 RETURNS TABLE(tipo text, etiqueta text, importe numeric, lineas integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  a AS (
    SELECT v.* FROM public.ventas_diarias v JOIN p ON p.cod_cliente = v.cod_cliente
    WHERE v.operacion = 'Abono' AND EXTRACT(YEAR FROM v.fecha)::int = _anio
  )
  (SELECT 'motivo', COALESCE(NULLIF(motivo_abono,''),'Sin motivo'), ABS(SUM(importe)), COUNT(*)::int
   FROM a GROUP BY 2 ORDER BY ABS(SUM(importe)) DESC LIMIT GREATEST(1, LEAST(_limite, 50)))
  UNION ALL
  (SELECT 'referencia', referencia, ABS(SUM(importe)), COUNT(*)::int
   FROM a GROUP BY 2 ORDER BY ABS(SUM(importe)) DESC LIMIT GREATEST(1, LEAST(_limite, 50)))
  UNION ALL
  (SELECT 'vendedor', COALESCE(NULLIF(vendedor_linea,''),'Sin asignar'), ABS(SUM(importe)), COUNT(*)::int
   FROM a GROUP BY 2 ORDER BY ABS(SUM(importe)) DESC LIMIT GREATEST(1, LEAST(_limite, 50)));
$function$;

CREATE OR REPLACE FUNCTION public.cliente_documentos(_cod integer, _limite integer DEFAULT 100)
 RETURNS TABLE(id_documento text, fecha date, hora time, tipo_documento text, operacion text, canal text,
               almacen text, vendedor_linea text, registrado_por text, importe numeric, margen numeric, lineas integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_view_cliente(auth.uid(), _cod) THEN RETURN; END IF;
  RETURN QUERY
  SELECT v.id_documento, MIN(v.fecha), MIN(v.hora),
         (array_agg(v.tipo_documento))[1], (array_agg(v.operacion))[1], (array_agg(v.canal))[1],
         (array_agg(v.almacen))[1], (array_agg(v.vendedor_linea))[1], (array_agg(v.registrado_por))[1],
         SUM(v.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(v.margen) ELSE 0 END,
         COUNT(*)::int
  FROM public.ventas_diarias v
  WHERE v.cod_cliente = _cod AND v.id_documento IS NOT NULL
  GROUP BY v.id_documento
  ORDER BY MIN(v.fecha) DESC, MIN(v.hora) DESC
  LIMIT GREATEST(1, LEAST(_limite, 500));
END; $function$;

CREATE OR REPLACE FUNCTION public.cliente_documento_lineas(_cod integer, _id_documento text)
 RETURNS TABLE(referencia text, descripcion text, marca text, familia text, unidades numeric, importe numeric, margen numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_view_cliente(auth.uid(), _cod) THEN RETURN; END IF;
  RETURN QUERY
  SELECT v.referencia, COALESCE(NULLIF(v.descripcion_linea,''), p.descripcion),
         COALESCE(p.marca_nombre, v.marca), COALESCE(p.familia_nombre, v.familia),
         v.unidades, v.importe,
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN v.margen ELSE 0 END
  FROM public.ventas_diarias v
  LEFT JOIN public.productos p ON p.referencia = v.referencia
  WHERE v.cod_cliente = _cod AND v.id_documento = _id_documento
  ORDER BY v.linea NULLS LAST
  LIMIT 300;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.panel_canales(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.panel_devoluciones(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cliente_documentos(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cliente_documento_lineas(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.panel_canales(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_devoluciones(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_documentos(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_documento_lineas(integer, text) TO authenticated;