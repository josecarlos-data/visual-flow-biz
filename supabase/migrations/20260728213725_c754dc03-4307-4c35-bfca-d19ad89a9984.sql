-- Permiso de margen
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ver_margen boolean NOT NULL DEFAULT false;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cod_vendedor text;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS familia_marca text;

CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN RAISE EXCEPTION 'Cannot modify is_approved'; END IF;
  IF NEW.ver_margen IS DISTINCT FROM OLD.ver_margen THEN RAISE EXCEPTION 'Cannot modify ver_margen'; END IF;
  IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN RAISE EXCEPTION 'Cannot modify employee_code'; END IF;
  IF NEW.delegacion IS DISTINCT FROM OLD.delegacion THEN RAISE EXCEPTION 'Cannot modify delegacion'; END IF;
  IF NEW.zone_id IS DISTINCT FROM OLD.zone_id THEN RAISE EXCEPTION 'Cannot modify zone_id'; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Cannot modify user_id'; END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN RAISE EXCEPTION 'Cannot modify email'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.puede_ver_margen(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT COALESCE((SELECT ver_margen FROM public.profiles WHERE user_id = _user_id LIMIT 1), false) OR public.is_admin(_user_id) $$;

CREATE OR REPLACE FUNCTION public.can_view_cliente(_user_id uuid, _cod integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.is_approved(_user_id) AND (
    public.is_admin(_user_id)
    OR public.has_role(_user_id, 'director_comercial')
    OR (public.has_role(_user_id, 'jefe_de_zona') AND EXISTS (
          SELECT 1 FROM public.clientes c WHERE c.cod_cliente = _cod AND c.delegacion = public.get_user_delegacion(_user_id)))
    OR (public.has_role(_user_id, 'comercial') AND EXISTS (
          SELECT 1 FROM public.clientes c WHERE c.cod_cliente = _cod AND c.vendedor = public.get_user_employee_code(_user_id)))
  )
$$;

GRANT EXECUTE ON FUNCTION public.puede_ver_margen(uuid) TO authenticated;

-- Detalle diario
CREATE TABLE IF NOT EXISTS public.ventas_diarias (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cod_cliente integer NOT NULL,
  referencia text NOT NULL,
  marca text,
  familia text,
  fecha date NOT NULL,
  unidades numeric NOT NULL DEFAULT 0,
  importe numeric NOT NULL DEFAULT 0,
  margen numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ventas_diarias TO authenticated;
GRANT ALL ON public.ventas_diarias TO service_role;
ALTER TABLE public.ventas_diarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role-scoped view ventas_diarias" ON public.ventas_diarias FOR SELECT TO authenticated
  USING (public.can_view_cliente(auth.uid(), cod_cliente));
CREATE POLICY "Admins manage ventas_diarias" ON public.ventas_diarias FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_vd_cliente ON public.ventas_diarias (cod_cliente);
CREATE INDEX IF NOT EXISTS idx_vd_fecha ON public.ventas_diarias (fecha);
CREATE INDEX IF NOT EXISTS idx_vd_familia ON public.ventas_diarias (familia);
CREATE INDEX IF NOT EXISTS idx_vd_marca ON public.ventas_diarias (marca);
CREATE INDEX IF NOT EXISTS idx_vd_ref ON public.ventas_diarias (referencia);

-- Resumen cliente x mes
CREATE TABLE IF NOT EXISTS public.resumen_cliente_mes (
  cod_cliente integer NOT NULL,
  anio integer NOT NULL,
  mes integer NOT NULL,
  importe numeric NOT NULL DEFAULT 0,
  margen numeric NOT NULL DEFAULT 0,
  unidades numeric NOT NULL DEFAULT 0,
  lineas integer NOT NULL DEFAULT 0,
  PRIMARY KEY (cod_cliente, anio, mes)
);
GRANT SELECT ON public.resumen_cliente_mes TO authenticated;
GRANT ALL ON public.resumen_cliente_mes TO service_role;
ALTER TABLE public.resumen_cliente_mes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role-scoped view resumen_cliente_mes" ON public.resumen_cliente_mes FOR SELECT TO authenticated
  USING (public.can_view_cliente(auth.uid(), cod_cliente));
CREATE POLICY "Admins manage resumen_cliente_mes" ON public.resumen_cliente_mes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_rcm_anio ON public.resumen_cliente_mes (anio, mes);

-- Resumen cliente x familia
CREATE TABLE IF NOT EXISTS public.resumen_cliente_familia (
  cod_cliente integer NOT NULL,
  anio integer NOT NULL,
  familia text NOT NULL,
  importe numeric NOT NULL DEFAULT 0,
  margen numeric NOT NULL DEFAULT 0,
  unidades numeric NOT NULL DEFAULT 0,
  ultima_compra date,
  PRIMARY KEY (cod_cliente, anio, familia)
);
GRANT SELECT ON public.resumen_cliente_familia TO authenticated;
GRANT ALL ON public.resumen_cliente_familia TO service_role;
ALTER TABLE public.resumen_cliente_familia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role-scoped view resumen_cliente_familia" ON public.resumen_cliente_familia FOR SELECT TO authenticated
  USING (public.can_view_cliente(auth.uid(), cod_cliente));
CREATE POLICY "Admins manage resumen_cliente_familia" ON public.resumen_cliente_familia FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_rcf_anio ON public.resumen_cliente_familia (anio);

-- Resumen cliente x marca
CREATE TABLE IF NOT EXISTS public.resumen_cliente_marca (
  cod_cliente integer NOT NULL,
  anio integer NOT NULL,
  marca text NOT NULL,
  importe numeric NOT NULL DEFAULT 0,
  margen numeric NOT NULL DEFAULT 0,
  unidades numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (cod_cliente, anio, marca)
);
GRANT SELECT ON public.resumen_cliente_marca TO authenticated;
GRANT ALL ON public.resumen_cliente_marca TO service_role;
ALTER TABLE public.resumen_cliente_marca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role-scoped view resumen_cliente_marca" ON public.resumen_cliente_marca FOR SELECT TO authenticated
  USING (public.can_view_cliente(auth.uid(), cod_cliente));
CREATE POLICY "Admins manage resumen_cliente_marca" ON public.resumen_cliente_marca FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_rcma_anio ON public.resumen_cliente_marca (anio);

-- Ficha rapida por cliente
CREATE TABLE IF NOT EXISTS public.cliente_kpis (
  cod_cliente integer PRIMARY KEY,
  primera_compra date,
  ultima_compra date,
  dias_sin_comprar integer,
  num_referencias integer NOT NULL DEFAULT 0,
  num_lineas integer NOT NULL DEFAULT 0,
  importe_total numeric NOT NULL DEFAULT 0,
  margen_total numeric NOT NULL DEFAULT 0,
  importe_anio_actual numeric NOT NULL DEFAULT 0,
  margen_anio_actual numeric NOT NULL DEFAULT 0,
  importe_anio_anterior numeric NOT NULL DEFAULT 0,
  margen_anio_anterior numeric NOT NULL DEFAULT 0,
  importe_anio_anterior_ytd numeric NOT NULL DEFAULT 0,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cliente_kpis TO authenticated;
GRANT ALL ON public.cliente_kpis TO service_role;
ALTER TABLE public.cliente_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role-scoped view cliente_kpis" ON public.cliente_kpis FOR SELECT TO authenticated
  USING (public.can_view_cliente(auth.uid(), cod_cliente));
CREATE POLICY "Admins manage cliente_kpis" ON public.cliente_kpis FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Recalculo de resumenes
CREATE OR REPLACE FUNCTION public.refrescar_resumenes_ventas()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_max date;
  v_anio integer;
  v_mes integer;
  v_dia integer;
BEGIN
  SELECT COALESCE(max(fecha), CURRENT_DATE) INTO v_max FROM public.ventas_diarias;
  v_anio := EXTRACT(YEAR FROM v_max)::int;
  v_mes := EXTRACT(MONTH FROM v_max)::int;
  v_dia := EXTRACT(DAY FROM v_max)::int;

  DELETE FROM public.resumen_cliente_mes;
  INSERT INTO public.resumen_cliente_mes (cod_cliente, anio, mes, importe, margen, unidades, lineas)
  SELECT cod_cliente, EXTRACT(YEAR FROM fecha)::int, EXTRACT(MONTH FROM fecha)::int,
         SUM(importe), SUM(margen), SUM(unidades), COUNT(*)
  FROM public.ventas_diarias GROUP BY 1,2,3;

  DELETE FROM public.resumen_cliente_familia;
  INSERT INTO public.resumen_cliente_familia (cod_cliente, anio, familia, importe, margen, unidades, ultima_compra)
  SELECT cod_cliente, EXTRACT(YEAR FROM fecha)::int, COALESCE(familia,'SIN'), SUM(importe), SUM(margen), SUM(unidades), MAX(fecha)
  FROM public.ventas_diarias GROUP BY 1,2,3;

  DELETE FROM public.resumen_cliente_marca;
  INSERT INTO public.resumen_cliente_marca (cod_cliente, anio, marca, importe, margen, unidades)
  SELECT cod_cliente, EXTRACT(YEAR FROM fecha)::int, COALESCE(marca,'SIN'), SUM(importe), SUM(margen), SUM(unidades)
  FROM public.ventas_diarias GROUP BY 1,2,3;

  DELETE FROM public.cliente_kpis;
  INSERT INTO public.cliente_kpis (cod_cliente, primera_compra, ultima_compra, dias_sin_comprar, num_referencias, num_lineas,
    importe_total, margen_total, importe_anio_actual, margen_anio_actual, importe_anio_anterior, margen_anio_anterior, importe_anio_anterior_ytd)
  SELECT cod_cliente, MIN(fecha), MAX(fecha), (v_max - MAX(fecha))::int,
    COUNT(DISTINCT referencia), COUNT(*), SUM(importe), SUM(margen),
    SUM(importe) FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio),
    SUM(margen)  FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio),
    SUM(importe) FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio - 1),
    SUM(margen)  FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio - 1),
    SUM(importe) FILTER (WHERE EXTRACT(YEAR FROM fecha)::int = v_anio - 1
      AND (EXTRACT(MONTH FROM fecha)::int < v_mes
        OR (EXTRACT(MONTH FROM fecha)::int = v_mes AND EXTRACT(DAY FROM fecha)::int <= v_dia)))
  FROM public.ventas_diarias GROUP BY cod_cliente;
END;
$$;
