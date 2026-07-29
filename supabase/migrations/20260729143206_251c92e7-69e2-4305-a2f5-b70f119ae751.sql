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
  ), scalar_compact AS (
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
      (array_agg(web ORDER BY length(web) DESC NULLS LAST) FILTER (WHERE web IS NOT NULL))[1] AS web
    FROM parsed
    GROUP BY cod_cliente
  ), extra_compact AS (
    SELECT cod_cliente, jsonb_object_agg(k, v) FILTER (WHERE k IS NOT NULL) AS extra
    FROM (
      SELECT DISTINCT ON (p.cod_cliente, e.k)
        p.cod_cliente,
        e.k,
        e.v
      FROM parsed p
      CROSS JOIN LATERAL jsonb_each_text(p.extra) e(k, v)
      WHERE e.v IS NOT NULL AND e.v <> ''
      ORDER BY p.cod_cliente, e.k, length(e.v) DESC
    ) extras
    GROUP BY cod_cliente
  ), compact AS (
    SELECT s.*, COALESCE(e.extra, '{}'::jsonb) AS extra
    FROM scalar_compact s
    LEFT JOIN extra_compact e USING (cod_cliente)
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
    provincia, telefono, telefono2, email, persona_contacto, web, extra
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