ALTER TABLE public.ventas_diarias
  ADD COLUMN IF NOT EXISTS id_documento text,
  ADD COLUMN IF NOT EXISTS ejercicio integer,
  ADD COLUMN IF NOT EXISTS num_documento integer,
  ADD COLUMN IF NOT EXISTS linea integer,
  ADD COLUMN IF NOT EXISTS tipo_documento text,
  ADD COLUMN IF NOT EXISTS operacion text,
  ADD COLUMN IF NOT EXISTS hora time,
  ADD COLUMN IF NOT EXISTS canal text,
  ADD COLUMN IF NOT EXISTS cod_almacen text,
  ADD COLUMN IF NOT EXISTS almacen text,
  ADD COLUMN IF NOT EXISTS cod_vendedor_linea text,
  ADD COLUMN IF NOT EXISTS vendedor_linea text,
  ADD COLUMN IF NOT EXISTS registrado_por text,
  ADD COLUMN IF NOT EXISTS motivo_abono text,
  ADD COLUMN IF NOT EXISTS id_doc_enlazado text,
  ADD COLUMN IF NOT EXISTS descripcion_linea text;

CREATE INDEX IF NOT EXISTS idx_vd_doc ON public.ventas_diarias (cod_cliente, ejercicio, id_documento);
CREATE INDEX IF NOT EXISTS idx_vd_fecha ON public.ventas_diarias (fecha);
CREATE INDEX IF NOT EXISTS idx_vd_canal ON public.ventas_diarias (canal);
CREATE INDEX IF NOT EXISTS idx_vd_operacion ON public.ventas_diarias (operacion);

CREATE TABLE IF NOT EXISTS public.resumen_documentos (
  cod_cliente integer NOT NULL,
  anio integer NOT NULL,
  mes integer NOT NULL,
  canal text NOT NULL DEFAULT 'SIN',
  documentos integer NOT NULL DEFAULT 0,
  abonos integer NOT NULL DEFAULT 0,
  importe numeric NOT NULL DEFAULT 0,
  importe_abonos numeric NOT NULL DEFAULT 0,
  margen numeric NOT NULL DEFAULT 0,
  unidades numeric NOT NULL DEFAULT 0,
  lineas integer NOT NULL DEFAULT 0,
  PRIMARY KEY (cod_cliente, anio, mes, canal)
);

GRANT SELECT ON public.resumen_documentos TO authenticated;
GRANT ALL ON public.resumen_documentos TO service_role;
ALTER TABLE public.resumen_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Role-scoped view resumen_documentos" ON public.resumen_documentos;
CREATE POLICY "Role-scoped view resumen_documentos" ON public.resumen_documentos
  FOR SELECT TO authenticated USING (public.can_view_cliente(auth.uid(), cod_cliente));
DROP POLICY IF EXISTS "Admins manage resumen_documentos" ON public.resumen_documentos;
CREATE POLICY "Admins manage resumen_documentos" ON public.resumen_documentos
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.cliente_kpis
  ADD COLUMN IF NOT EXISTS num_documentos_actual integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_documentos_anterior integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ticket_medio_actual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ticket_medio_anterior numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lineas_por_documento numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frecuencia_compra_dias numeric,
  ADD COLUMN IF NOT EXISTS num_abonos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS importe_abonos numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canal_principal text;

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
    TRUNCATE public.resumen_documentos;
    TRUNCATE public.ventas_diarias;
  END IF;

  INSERT INTO public.ventas_diarias (
    cod_cliente, referencia, marca, familia, fecha, unidades, importe, margen,
    id_documento, ejercicio, num_documento, linea, tipo_documento, operacion, hora, canal,
    cod_almacen, almacen, cod_vendedor_linea, vendedor_linea, registrado_por,
    motivo_abono, id_doc_enlazado, descripcion_linea)
  SELECT (r->>'cod_cliente')::int, r->>'referencia', NULLIF(r->>'marca',''), NULLIF(r->>'familia',''),
         (r->>'fecha')::date, COALESCE((r->>'unidades')::numeric,0), COALESCE((r->>'importe')::numeric,0), COALESCE((r->>'margen')::numeric,0),
         NULLIF(r->>'id_documento',''), NULLIF(r->>'ejercicio','')::int, NULLIF(r->>'num_documento','')::int,
         NULLIF(r->>'linea','')::int, NULLIF(r->>'tipo_documento',''), NULLIF(r->>'operacion',''),
         NULLIF(r->>'hora','')::time, NULLIF(r->>'canal',''), NULLIF(r->>'cod_almacen',''), NULLIF(r->>'almacen',''),
         NULLIF(r->>'cod_vendedor_linea',''), NULLIF(r->>'vendedor_linea',''), NULLIF(r->>'registrado_por',''),
         NULLIF(r->>'motivo_abono',''), NULLIF(r->>'id_doc_enlazado',''), NULLIF(r->>'descripcion_linea','')
  FROM jsonb_array_elements(_rows) r
  WHERE NULLIF(r->>'cod_cliente','') IS NOT NULL
    AND NULLIF(r->>'referencia','') IS NOT NULL
    AND NULLIF(r->>'fecha','') IS NOT NULL;

  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END;
$function$;

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
    public.resumen_documentos,
    public.ventas_diarias,
    public.detalle_ventas,
    public.ventas_mensuales,
    public.productos,
    public.clientes;
END;
$function$;