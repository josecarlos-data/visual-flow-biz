CREATE TABLE public.situaciones_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_cliente integer NOT NULL REFERENCES public.clientes(cod_cliente) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'otros',
  etiqueta text NOT NULL,
  nota text,
  activo boolean NOT NULL DEFAULT true,
  desde date NOT NULL DEFAULT CURRENT_DATE,
  hasta date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_situaciones_cliente_cod ON public.situaciones_cliente(cod_cliente);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.situaciones_cliente TO authenticated;
GRANT ALL ON public.situaciones_cliente TO service_role;

ALTER TABLE public.situaciones_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "situaciones_select" ON public.situaciones_cliente
  FOR SELECT TO authenticated
  USING (public.can_view_cliente(auth.uid(), cod_cliente));

CREATE POLICY "situaciones_insert" ON public.situaciones_cliente
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'director_comercial'));

CREATE POLICY "situaciones_update" ON public.situaciones_cliente
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'director_comercial'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'director_comercial'));

CREATE POLICY "situaciones_delete" ON public.situaciones_cliente
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'director_comercial'));

CREATE TRIGGER trg_situaciones_cliente_updated_at
  BEFORE UPDATE ON public.situaciones_cliente
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.situaciones_activas()
RETURNS TABLE(cod_cliente integer, etiqueta text, categoria text, nota text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (s.cod_cliente) s.cod_cliente, s.etiqueta, s.categoria, s.nota
  FROM public.situaciones_cliente s
  WHERE s.activo
    AND s.desde <= CURRENT_DATE
    AND (s.hasta IS NULL OR s.hasta >= CURRENT_DATE)
  ORDER BY s.cod_cliente, s.updated_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.situaciones_activas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.situaciones_activas() TO authenticated;

DROP FUNCTION IF EXISTS public.panel_alertas(integer);
CREATE OR REPLACE FUNCTION public.panel_alertas(_limite integer DEFAULT 15, _incluir_excluidos boolean DEFAULT false)
RETURNS TABLE(tipo text, cod_cliente integer, cliente text, vendedor text, valor numeric, valor_ref numeric, dias integer, etiqueta text, situacion_categoria text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  s AS (SELECT * FROM public.situaciones_activas()),
  k AS (
    SELECT k.*, COALESCE(c.cliente, 'Cliente ' || k.cod_cliente) AS nombre, c.vendedor,
           s.etiqueta AS etiqueta, s.categoria AS situacion_categoria
    FROM public.cliente_kpis k
    JOIN p ON p.cod_cliente = k.cod_cliente
    LEFT JOIN public.clientes c ON c.cod_cliente = k.cod_cliente
    LEFT JOIN s ON s.cod_cliente = k.cod_cliente
    WHERE _incluir_excluidos OR s.cod_cliente IS NULL
  )
  (SELECT 'caida', cod_cliente, nombre, vendedor, importe_anio_actual, importe_anio_anterior_ytd, dias_sin_comprar, etiqueta, situacion_categoria
   FROM k WHERE importe_anio_anterior_ytd > 1000 AND importe_anio_actual < importe_anio_anterior_ytd * 0.8
   ORDER BY (importe_anio_anterior_ytd - importe_anio_actual) DESC LIMIT GREATEST(1, LEAST(_limite, 50)))
  UNION ALL
  (SELECT 'fuga', cod_cliente, nombre, vendedor, importe_total, importe_anio_anterior, dias_sin_comprar, etiqueta, situacion_categoria
   FROM k WHERE dias_sin_comprar > 90 AND importe_total > 1000
   ORDER BY importe_anio_anterior DESC LIMIT GREATEST(1, LEAST(_limite, 50)))
  UNION ALL
  (SELECT 'margen_bajo', cod_cliente, nombre, vendedor, importe_anio_actual,
          CASE WHEN importe_anio_actual > 0 THEN margen_anio_actual / importe_anio_actual * 100 ELSE 0 END, dias_sin_comprar, etiqueta, situacion_categoria
   FROM k WHERE public.puede_ver_margen(auth.uid()) AND importe_anio_actual > 5000
     AND margen_anio_actual / NULLIF(importe_anio_actual,0) < 0.20
   ORDER BY importe_anio_actual DESC LIMIT GREATEST(1, LEAST(_limite, 50)));
$$;

REVOKE EXECUTE ON FUNCTION public.panel_alertas(integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.panel_alertas(integer, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.panel_dormidos(integer);
CREATE OR REPLACE FUNCTION public.panel_dormidos(_limite integer DEFAULT 25, _incluir_excluidos boolean DEFAULT false)
RETURNS TABLE(cod_cliente integer, cliente text, vendedor text, ultima_compra date, importe_total numeric, etiqueta text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  s AS (SELECT * FROM public.situaciones_activas())
  SELECT c.cod_cliente, c.cliente, c.vendedor, k.ultima_compra, COALESCE(k.importe_total, 0), s.etiqueta
  FROM public.clientes c
  JOIN p ON p.cod_cliente = c.cod_cliente
  LEFT JOIN public.cliente_kpis k ON k.cod_cliente = c.cod_cliente
  LEFT JOIN s ON s.cod_cliente = c.cod_cliente
  WHERE (k.cod_cliente IS NULL OR k.dias_sin_comprar > 365)
    AND (_incluir_excluidos OR s.cod_cliente IS NULL)
  ORDER BY COALESCE(k.importe_total, 0) DESC, c.cliente
  LIMIT GREATEST(1, LEAST(_limite, 200));
$$;

REVOKE EXECUTE ON FUNCTION public.panel_dormidos(integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.panel_dormidos(integer, boolean) TO authenticated;