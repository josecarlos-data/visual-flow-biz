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

  TRUNCATE public.cliente_insights;
  TRUNCATE public.visitas_planificadas;
  TRUNCATE public.visitas;
  TRUNCATE public.cliente_productos;
  TRUNCATE public.cliente_kpis;
  TRUNCATE public.resumen_cliente_mes;
  TRUNCATE public.resumen_cliente_familia;
  TRUNCATE public.resumen_cliente_marca;
  TRUNCATE public.ventas_diarias;
  TRUNCATE public.detalle_ventas;
  TRUNCATE public.ventas_mensuales;
  TRUNCATE public.productos;
  TRUNCATE public.clientes;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reset_maestro_isi_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_maestro_isi_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_maestro_isi_data() TO service_role;

CREATE INDEX IF NOT EXISTS idx_ventas_diarias_fecha_cliente ON public.ventas_diarias (fecha, cod_cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_cliente_fecha ON public.ventas_diarias (cod_cliente, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_familia_fecha ON public.ventas_diarias (familia, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_marca_fecha ON public.ventas_diarias (marca, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_referencia ON public.ventas_diarias (referencia);

CREATE OR REPLACE FUNCTION public.upsert_productos_maestro(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;

  WITH parsed AS (
    SELECT
      NULLIF(trim(r->>'referencia'), '') AS referencia,
      NULLIF(r->>'descripcion','') AS descripcion,
      NULLIF(r->>'familia','') AS familia,
      NULLIF(r->>'familia_nombre','') AS familia_nombre,
      NULLIF(r->>'marca','') AS marca,
      NULLIF(r->>'marca_nombre','') AS marca_nombre,
      NULLIF(r->>'cod_proveedor','') AS cod_proveedor,
      NULLIF(r->>'proveedor','') AS proveedor,
      NULLIF(r->>'estado','') AS estado,
      NULLIF(r->>'sustituye_a','') AS sustituye_a,
      NULLIF(r->>'sustituida_por','') AS sustituida_por,
      NULLIF(r->>'observaciones','') AS observaciones,
      NULLIF(r->>'primera_venta','')::date AS primera_venta,
      NULLIF(r->>'ultima_venta','')::date AS ultima_venta,
      NULLIF(r->>'unidades_periodo','')::numeric AS unidades_periodo,
      NULLIF(r->>'importe_periodo','')::numeric AS importe_periodo
    FROM jsonb_array_elements(_rows) r
  ), compact AS (
    SELECT
      referencia,
      (array_agg(descripcion ORDER BY length(descripcion) DESC NULLS LAST) FILTER (WHERE descripcion IS NOT NULL))[1] AS descripcion,
      (array_agg(familia ORDER BY length(familia) DESC NULLS LAST) FILTER (WHERE familia IS NOT NULL))[1] AS familia,
      (array_agg(familia_nombre ORDER BY length(familia_nombre) DESC NULLS LAST) FILTER (WHERE familia_nombre IS NOT NULL))[1] AS familia_nombre,
      (array_agg(marca ORDER BY length(marca) DESC NULLS LAST) FILTER (WHERE marca IS NOT NULL))[1] AS marca,
      (array_agg(marca_nombre ORDER BY length(marca_nombre) DESC NULLS LAST) FILTER (WHERE marca_nombre IS NOT NULL))[1] AS marca_nombre,
      (array_agg(cod_proveedor ORDER BY length(cod_proveedor) DESC NULLS LAST) FILTER (WHERE cod_proveedor IS NOT NULL))[1] AS cod_proveedor,
      (array_agg(proveedor ORDER BY length(proveedor) DESC NULLS LAST) FILTER (WHERE proveedor IS NOT NULL))[1] AS proveedor,
      (array_agg(estado ORDER BY length(estado) DESC NULLS LAST) FILTER (WHERE estado IS NOT NULL))[1] AS estado,
      (array_agg(sustituye_a ORDER BY length(sustituye_a) DESC NULLS LAST) FILTER (WHERE sustituye_a IS NOT NULL))[1] AS sustituye_a,
      (array_agg(sustituida_por ORDER BY length(sustituida_por) DESC NULLS LAST) FILTER (WHERE sustituida_por IS NOT NULL))[1] AS sustituida_por,
      (array_agg(observaciones ORDER BY length(observaciones) DESC NULLS LAST) FILTER (WHERE observaciones IS NOT NULL))[1] AS observaciones,
      min(primera_venta) AS primera_venta,
      max(ultima_venta) AS ultima_venta,
      max(unidades_periodo) AS unidades_periodo,
      max(importe_periodo) AS importe_periodo
    FROM parsed
    WHERE referencia IS NOT NULL
    GROUP BY referencia
  )
  INSERT INTO public.productos (
    referencia, descripcion, familia, familia_nombre, marca, marca_nombre,
    cod_proveedor, proveedor, estado, sustituye_a, sustituida_por, observaciones,
    primera_venta, ultima_venta, unidades_periodo, importe_periodo
  )
  SELECT
    referencia, descripcion, familia, familia_nombre, marca, marca_nombre,
    cod_proveedor, proveedor, estado, sustituye_a, sustituida_por, observaciones,
    primera_venta, ultima_venta, unidades_periodo, importe_periodo
  FROM compact
  ON CONFLICT (referencia) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    familia = EXCLUDED.familia,
    familia_nombre = EXCLUDED.familia_nombre,
    marca = EXCLUDED.marca,
    marca_nombre = EXCLUDED.marca_nombre,
    cod_proveedor = EXCLUDED.cod_proveedor,
    proveedor = EXCLUDED.proveedor,
    estado = EXCLUDED.estado,
    sustituye_a = EXCLUDED.sustituye_a,
    sustituida_por = EXCLUDED.sustituida_por,
    observaciones = EXCLUDED.observaciones,
    primera_venta = EXCLUDED.primera_venta,
    ultima_venta = EXCLUDED.ultima_venta,
    unidades_periodo = EXCLUDED.unidades_periodo,
    importe_periodo = EXCLUDED.importe_periodo,
    updated_at = now();

  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_clientes_maestro(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;

  WITH parsed AS (
    SELECT
      NULLIF(r->>'cod_cliente','')::int AS cod_cliente,
      NULLIF(r->>'cliente','') AS cliente,
      NULLIF(r->>'razon_social','') AS razon_social,
      NULLIF(r->>'cif','') AS cif,
      NULLIF(r->>'ruta_comercial','') AS ruta_comercial,
      NULLIF(r->>'cod_delegacion','') AS cod_delegacion,
      NULLIF(r->>'delegacion','') AS delegacion,
      NULLIF(r->>'cod_vendedor','') AS cod_vendedor,
      NULLIF(r->>'vendedor','') AS vendedor,
      NULLIF(r->>'cod_tipo_cliente','') AS cod_tipo_cliente,
      NULLIF(r->>'num_empleados_taller','')::int AS num_empleados_taller,
      NULLIF(r->>'observaciones_almacen','') AS observaciones_almacen,
      NULLIF(r->>'fecha_alta','')::date AS fecha_alta,
      NULLIF(r->>'cod_prohibicion_venta','') AS cod_prohibicion_venta,
      NULLIF(r->>'prohibicion_venta','') AS prohibicion_venta,
      NULLIF(r->>'cod_rappel','') AS cod_rappel,
      NULLIF(r->>'grupo_rappel','') AS grupo_rappel,
      NULLIF(r->>'tramos_rappel','') AS tramos_rappel,
      NULLIF(r->>'grupo','') AS grupo,
      NULLIF(r->>'ruta_especial','') AS ruta_especial,
      COALESCE(NULLIF(r->>'top_truck','')::boolean, false) AS top_truck,
      NULLIF(r->>'direccion','') AS direccion,
      NULLIF(r->>'cod_postal','') AS cod_postal,
      NULLIF(r->>'localidad','') AS localidad,
      NULLIF(r->>'provincia','') AS provincia,
      NULLIF(r->>'telefono','') AS telefono,
      NULLIF(r->>'telefono2','') AS telefono2,
      NULLIF(r->>'email','') AS email,
      NULLIF(r->>'persona_contacto','') AS persona_contacto,
      NULLIF(r->>'web','') AS web,
      COALESCE(r->'extra', '{}'::jsonb) AS extra
    FROM jsonb_array_elements(_rows) r
    WHERE NULLIF(r->>'cod_cliente','') IS NOT NULL
  ), compact AS (
    SELECT
      cod_cliente,
      COALESCE(
        (array_agg(cliente ORDER BY length(cliente) DESC NULLS LAST) FILTER (WHERE cliente IS NOT NULL))[1],
        (array_agg(razon_social ORDER BY length(razon_social) DESC NULLS LAST) FILTER (WHERE razon_social IS NOT NULL))[1],
        'CLIENTE ' || cod_cliente
      ) AS cliente,
      (array_agg(razon_social ORDER BY length(razon_social) DESC NULLS LAST) FILTER (WHERE razon_social IS NOT NULL))[1] AS razon_social,
      (array_agg(cif ORDER BY length(cif) DESC NULLS LAST) FILTER (WHERE cif IS NOT NULL))[1] AS cif,
      (array_agg(ruta_comercial ORDER BY length(ruta_comercial) DESC NULLS LAST) FILTER (WHERE ruta_comercial IS NOT NULL))[1] AS ruta_comercial,
      (array_agg(cod_delegacion ORDER BY length(cod_delegacion) DESC NULLS LAST) FILTER (WHERE cod_delegacion IS NOT NULL))[1] AS cod_delegacion,
      (array_agg(delegacion ORDER BY length(delegacion) DESC NULLS LAST) FILTER (WHERE delegacion IS NOT NULL))[1] AS delegacion,
      (array_agg(cod_vendedor ORDER BY length(cod_vendedor) DESC NULLS LAST) FILTER (WHERE cod_vendedor IS NOT NULL))[1] AS cod_vendedor,
      (array_agg(vendedor ORDER BY length(vendedor) DESC NULLS LAST) FILTER (WHERE vendedor IS NOT NULL))[1] AS vendedor,
      (array_agg(cod_tipo_cliente ORDER BY length(cod_tipo_cliente) DESC NULLS LAST) FILTER (WHERE cod_tipo_cliente IS NOT NULL))[1] AS cod_tipo_cliente,
      max(num_empleados_taller) AS num_empleados_taller,
      (array_agg(observaciones_almacen ORDER BY length(observaciones_almacen) DESC NULLS LAST) FILTER (WHERE observaciones_almacen IS NOT NULL))[1] AS observaciones_almacen,
      min(fecha_alta) AS fecha_alta,
      (array_agg(cod_prohibicion_venta ORDER BY length(cod_prohibicion_venta) DESC NULLS LAST) FILTER (WHERE cod_prohibicion_venta IS NOT NULL))[1] AS cod_prohibicion_venta,
      (array_agg(prohibicion_venta ORDER BY length(prohibicion_venta) DESC NULLS LAST) FILTER (WHERE prohibicion_venta IS NOT NULL))[1] AS prohibicion_venta,
      (array_agg(cod_rappel ORDER BY length(cod_rappel) DESC NULLS LAST) FILTER (WHERE cod_rappel IS NOT NULL))[1] AS cod_rappel,
      (array_agg(grupo_rappel ORDER BY length(grupo_rappel) DESC NULLS LAST) FILTER (WHERE grupo_rappel IS NOT NULL))[1] AS grupo_rappel,
      (array_agg(tramos_rappel ORDER BY length(tramos_rappel) DESC NULLS LAST) FILTER (WHERE tramos_rappel IS NOT NULL))[1] AS tramos_rappel,
      (array_agg(grupo ORDER BY length(grupo) DESC NULLS LAST) FILTER (WHERE grupo IS NOT NULL))[1] AS grupo,
      (array_agg(ruta_especial ORDER BY length(ruta_especial) DESC NULLS LAST) FILTER (WHERE ruta_especial IS NOT NULL))[1] AS ruta_especial,
      bool_or(top_truck) AS top_truck,
      (array_agg(direccion ORDER BY length(direccion) DESC NULLS LAST) FILTER (WHERE direccion IS NOT NULL))[1] AS direccion,
      (array_agg(cod_postal ORDER BY length(cod_postal) DESC NULLS LAST) FILTER (WHERE cod_postal IS NOT NULL))[1] AS cod_postal,
      (array_agg(localidad ORDER BY length(localidad) DESC NULLS LAST) FILTER (WHERE localidad IS NOT NULL))[1] AS localidad,
      (array_agg(provincia ORDER BY length(provincia) DESC NULLS LAST) FILTER (WHERE provincia IS NOT NULL))[1] AS provincia,
      (array_agg(telefono ORDER BY length(telefono) DESC NULLS LAST) FILTER (WHERE telefono IS NOT NULL))[1] AS telefono,
      (array_agg(telefono2 ORDER BY length(telefono2) DESC NULLS LAST) FILTER (WHERE telefono2 IS NOT NULL))[1] AS telefono2,
      (array_agg(email ORDER BY length(email) DESC NULLS LAST) FILTER (WHERE email IS NOT NULL))[1] AS email,
      (array_agg(persona_contacto ORDER BY length(persona_contacto) DESC NULLS LAST) FILTER (WHERE persona_contacto IS NOT NULL))[1] AS persona_contacto,
      (array_agg(web ORDER BY length(web) DESC NULLS LAST) FILTER (WHERE web IS NOT NULL))[1] AS web,
      jsonb_strip_nulls(jsonb_object_agg(k, v)) AS extra
    FROM parsed p
    LEFT JOIN LATERAL jsonb_each_text(p.extra) e(k, v) ON true
    GROUP BY cod_cliente
  )
  INSERT INTO public.clientes (
    cod_cliente, cliente, razon_social, cif, ruta_comercial, cod_delegacion, delegacion,
    cod_vendedor, vendedor, cod_tipo_cliente, num_empleados_taller, observaciones_almacen,
    fecha_alta, cod_prohibicion_venta, prohibicion_venta, cod_rappel, grupo_rappel,
    tramos_rappel, grupo, ruta_especial, top_truck, direccion, cod_postal, localidad,
    provincia, telefono, telefono2, email, persona_contacto, web, extra
  )
  SELECT
    cod_cliente, cliente, razon_social, cif, ruta_comercial, cod_delegacion, delegacion,
    cod_vendedor, vendedor, cod_tipo_cliente, num_empleados_taller, observaciones_almacen,
    fecha_alta, cod_prohibicion_venta, prohibicion_venta, cod_rappel, grupo_rappel,
    tramos_rappel, grupo, ruta_especial, top_truck, direccion, cod_postal, localidad,
    provincia, telefono, telefono2, email, persona_contacto, web, COALESCE(extra, '{}'::jsonb)
  FROM compact
  ON CONFLICT (cod_cliente) DO UPDATE SET
    cliente = EXCLUDED.cliente,
    razon_social = EXCLUDED.razon_social,
    cif = EXCLUDED.cif,
    ruta_comercial = EXCLUDED.ruta_comercial,
    cod_delegacion = EXCLUDED.cod_delegacion,
    delegacion = EXCLUDED.delegacion,
    cod_vendedor = EXCLUDED.cod_vendedor,
    vendedor = EXCLUDED.vendedor,
    cod_tipo_cliente = EXCLUDED.cod_tipo_cliente,
    num_empleados_taller = EXCLUDED.num_empleados_taller,
    observaciones_almacen = EXCLUDED.observaciones_almacen,
    fecha_alta = EXCLUDED.fecha_alta,
    cod_prohibicion_venta = EXCLUDED.cod_prohibicion_venta,
    prohibicion_venta = EXCLUDED.prohibicion_venta,
    cod_rappel = EXCLUDED.cod_rappel,
    grupo_rappel = EXCLUDED.grupo_rappel,
    tramos_rappel = EXCLUDED.tramos_rappel,
    grupo = EXCLUDED.grupo,
    ruta_especial = EXCLUDED.ruta_especial,
    top_truck = EXCLUDED.top_truck,
    direccion = EXCLUDED.direccion,
    cod_postal = EXCLUDED.cod_postal,
    localidad = EXCLUDED.localidad,
    provincia = EXCLUDED.provincia,
    telefono = EXCLUDED.telefono,
    telefono2 = EXCLUDED.telefono2,
    email = EXCLUDED.email,
    persona_contacto = EXCLUDED.persona_contacto,
    web = EXCLUDED.web,
    extra = EXCLUDED.extra,
    updated_at = now();

  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insertar_ventas_diarias(_rows jsonb, _reset boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;

  IF _reset THEN
    TRUNCATE public.cliente_kpis;
    TRUNCATE public.resumen_cliente_mes;
    TRUNCATE public.resumen_cliente_familia;
    TRUNCATE public.resumen_cliente_marca;
    TRUNCATE public.ventas_diarias;
  END IF;

  INSERT INTO public.ventas_diarias (cod_cliente, referencia, marca, familia, fecha, unidades, importe, margen)
  SELECT (r->>'cod_cliente')::int, r->>'referencia', NULLIF(r->>'marca',''), NULLIF(r->>'familia',''),
         (r->>'fecha')::date, COALESCE((r->>'unidades')::numeric,0), COALESCE((r->>'importe')::numeric,0), COALESCE((r->>'margen')::numeric,0)
  FROM jsonb_array_elements(_rows) r
  WHERE NULLIF(r->>'cod_cliente','') IS NOT NULL
    AND NULLIF(r->>'referencia','') IS NOT NULL
    AND NULLIF(r->>'fecha','') IS NOT NULL;

  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refrescar_resumenes_ventas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max date; v_anio integer; v_mes integer; v_dia integer;
BEGIN
  SET LOCAL statement_timeout = '180s';

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

  TRUNCATE public.cliente_kpis;
  INSERT INTO public.cliente_kpis (cod_cliente, primera_compra, ultima_compra, dias_sin_comprar, num_referencias, num_lineas,
    importe_total, margen_total, importe_anio_actual, margen_anio_actual, importe_anio_anterior, margen_anio_anterior, importe_anio_anterior_ytd)
  SELECT cod_cliente, MIN(fecha), MAX(fecha), (v_max - MAX(fecha))::int,
    COUNT(DISTINCT referencia), COUNT(*), SUM(importe), SUM(margen),
    COALESCE(SUM(importe) FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio),0),
    COALESCE(SUM(margen)  FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio),0),
    COALESCE(SUM(importe) FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio - 1),0),
    COALESCE(SUM(margen)  FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio - 1),0),
    COALESCE(SUM(importe) FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio - 1
      AND (EXTRACT(MONTH FROM fecha)::int < v_mes
        OR (EXTRACT(MONTH FROM fecha)::int = v_mes AND EXTRACT(DAY FROM fecha)::int <= v_dia))),0)
  FROM public.ventas_diarias GROUP BY cod_cliente;
END;
$function$;