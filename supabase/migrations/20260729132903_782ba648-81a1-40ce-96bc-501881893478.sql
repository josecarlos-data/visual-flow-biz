-- 1. Vaciado de datos (se conservan usuarios, roles, dashboards, ajustes y motivos)
TRUNCATE TABLE public.ventas_diarias, public.resumen_cliente_mes, public.resumen_cliente_familia,
  public.resumen_cliente_marca, public.cliente_kpis, public.cliente_productos,
  public.cliente_insights, public.visitas_planificadas, public.visitas,
  public.detalle_ventas, public.ventas_mensuales, public.compras,
  public.rutas, public.productos, public.clientes, public.sync_log;

-- 2. Clientes: nuevas columnas
ALTER TABLE public.clientes
  DROP COLUMN IF EXISTS observaciones,
  ADD COLUMN IF NOT EXISTS razon_social text,
  ADD COLUMN IF NOT EXISTS cif text,
  ADD COLUMN IF NOT EXISTS ruta_comercial text,
  ADD COLUMN IF NOT EXISTS cod_delegacion text,
  ADD COLUMN IF NOT EXISTS cod_tipo_cliente text,
  ADD COLUMN IF NOT EXISTS num_empleados_taller integer,
  ADD COLUMN IF NOT EXISTS observaciones_almacen text,
  ADD COLUMN IF NOT EXISTS fecha_alta date,
  ADD COLUMN IF NOT EXISTS cod_prohibicion_venta text,
  ADD COLUMN IF NOT EXISTS prohibicion_venta text,
  ADD COLUMN IF NOT EXISTS cod_rappel text,
  ADD COLUMN IF NOT EXISTS grupo_rappel text,
  ADD COLUMN IF NOT EXISTS tramos_rappel text,
  ADD COLUMN IF NOT EXISTS grupo text,
  ADD COLUMN IF NOT EXISTS ruta_especial text,
  ADD COLUMN IF NOT EXISTS cod_postal text,
  ADD COLUMN IF NOT EXISTS telefono2 text,
  ADD COLUMN IF NOT EXISTS persona_contacto text,
  ADD COLUMN IF NOT EXISTS web text,
  ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.clientes DROP COLUMN IF EXISTS top_truck;
ALTER TABLE public.clientes ADD COLUMN top_truck boolean NOT NULL DEFAULT false;

-- 3. Productos: nuevas columnas
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS familia_nombre text,
  ADD COLUMN IF NOT EXISTS marca_nombre text,
  ADD COLUMN IF NOT EXISTS cod_proveedor text,
  ADD COLUMN IF NOT EXISTS proveedor text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS sustituye_a text,
  ADD COLUMN IF NOT EXISTS sustituida_por text,
  ADD COLUMN IF NOT EXISTS observaciones text,
  ADD COLUMN IF NOT EXISTS primera_venta date,
  ADD COLUMN IF NOT EXISTS ultima_venta date,
  ADD COLUMN IF NOT EXISTS unidades_periodo numeric,
  ADD COLUMN IF NOT EXISTS importe_periodo numeric;

-- 4. RPC de carga de clientes
CREATE OR REPLACE FUNCTION public.upsert_clientes_maestro(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  INSERT INTO public.clientes (
    cod_cliente, cliente, razon_social, cif, ruta_comercial, cod_delegacion, delegacion,
    cod_vendedor, vendedor, cod_tipo_cliente, num_empleados_taller, observaciones_almacen,
    fecha_alta, cod_prohibicion_venta, prohibicion_venta, cod_rappel, grupo_rappel,
    tramos_rappel, grupo, ruta_especial, top_truck, direccion, cod_postal, localidad,
    provincia, telefono, telefono2, email, persona_contacto, web, extra
  )
  SELECT (r->>'cod_cliente')::int,
         COALESCE(NULLIF(r->>'cliente',''), NULLIF(r->>'razon_social',''), 'CLIENTE ' || (r->>'cod_cliente')),
         NULLIF(r->>'razon_social',''), NULLIF(r->>'cif',''), NULLIF(r->>'ruta_comercial',''),
         NULLIF(r->>'cod_delegacion',''), NULLIF(r->>'delegacion',''),
         NULLIF(r->>'cod_vendedor',''), NULLIF(r->>'vendedor',''), NULLIF(r->>'cod_tipo_cliente',''),
         NULLIF(r->>'num_empleados_taller','')::int, NULLIF(r->>'observaciones_almacen',''),
         NULLIF(r->>'fecha_alta','')::date, NULLIF(r->>'cod_prohibicion_venta',''),
         NULLIF(r->>'prohibicion_venta',''), NULLIF(r->>'cod_rappel',''), NULLIF(r->>'grupo_rappel',''),
         NULLIF(r->>'tramos_rappel',''), NULLIF(r->>'grupo',''), NULLIF(r->>'ruta_especial',''),
         COALESCE((r->>'top_truck')::boolean, false), NULLIF(r->>'direccion',''), NULLIF(r->>'cod_postal',''),
         NULLIF(r->>'localidad',''), NULLIF(r->>'provincia',''), NULLIF(r->>'telefono',''),
         NULLIF(r->>'telefono2',''), NULLIF(r->>'email',''), NULLIF(r->>'persona_contacto',''),
         NULLIF(r->>'web',''), COALESCE(r->'extra', '{}'::jsonb)
  FROM jsonb_array_elements(_rows) r
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
END; $function$;

-- 5. RPC de carga de productos
CREATE OR REPLACE FUNCTION public.upsert_productos_maestro(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  INSERT INTO public.productos (
    referencia, descripcion, familia, familia_nombre, marca, marca_nombre,
    cod_proveedor, proveedor, estado, sustituye_a, sustituida_por, observaciones,
    primera_venta, ultima_venta, unidades_periodo, importe_periodo
  )
  SELECT r->>'referencia', NULLIF(r->>'descripcion',''), NULLIF(r->>'familia',''),
         NULLIF(r->>'familia_nombre',''), NULLIF(r->>'marca',''), NULLIF(r->>'marca_nombre',''),
         NULLIF(r->>'cod_proveedor',''), NULLIF(r->>'proveedor',''), NULLIF(r->>'estado',''),
         NULLIF(r->>'sustituye_a',''), NULLIF(r->>'sustituida_por',''), NULLIF(r->>'observaciones',''),
         NULLIF(r->>'primera_venta','')::date, NULLIF(r->>'ultima_venta','')::date,
         NULLIF(r->>'unidades_periodo','')::numeric, NULLIF(r->>'importe_periodo','')::numeric
  FROM jsonb_array_elements(_rows) r
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
END; $function$;

-- 6. marcar_top_truck ya no aplica (Top Truck viene en el maestro)
DROP FUNCTION IF EXISTS public.marcar_top_truck(jsonb);