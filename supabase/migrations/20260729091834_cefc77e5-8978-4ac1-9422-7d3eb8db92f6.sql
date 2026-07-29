
CREATE INDEX IF NOT EXISTS idx_rcm_cod ON public.resumen_cliente_mes(cod_cliente);
CREATE INDEX IF NOT EXISTS idx_rcf_cod ON public.resumen_cliente_familia(cod_cliente);
CREATE INDEX IF NOT EXISTS idx_rcma_cod ON public.resumen_cliente_marca(cod_cliente);

-- Ajustes de aplicación
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Approved users read app_settings" ON public.app_settings;
CREATE POLICY "Approved users read app_settings" ON public.app_settings
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
DROP POLICY IF EXISTS "Admins manage app_settings" ON public.app_settings;
CREATE POLICY "Admins manage app_settings" ON public.app_settings
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings(key, value, description)
VALUES ('anios_cliente_activo', '3', 'Años hacia atrás con al menos una venta para considerar activo a un cliente')
ON CONFLICT (key) DO NOTHING;

-- Conjunto de clientes visibles resuelto una sola vez
CREATE OR REPLACE FUNCTION public.clientes_permitidos(_user_id uuid)
RETURNS TABLE(cod_cliente integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.cod_cliente FROM public.clientes c
  WHERE public.is_approved(_user_id) AND (
    public.is_admin(_user_id)
    OR public.has_role(_user_id, 'director_comercial')
    OR (public.has_role(_user_id, 'jefe_de_zona') AND c.delegacion = public.get_user_delegacion(_user_id))
    OR (public.has_role(_user_id, 'comercial') AND c.vendedor = public.get_user_employee_code(_user_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.panel_ventas_kpis()
RETURNS TABLE(anio integer, importe numeric, margen numeric, unidades numeric, clientes integer, lineas integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid()))
  SELECT r.anio, SUM(r.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(r.margen) ELSE 0 END,
         SUM(r.unidades), COUNT(DISTINCT r.cod_cliente)::int, SUM(r.lineas)::int
  FROM public.resumen_cliente_mes r JOIN p ON p.cod_cliente = r.cod_cliente
  GROUP BY r.anio ORDER BY r.anio;
$$;

CREATE OR REPLACE FUNCTION public.panel_ventas_mensual()
RETURNS TABLE(anio integer, mes integer, importe numeric, margen numeric, unidades numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid()))
  SELECT r.anio, r.mes, SUM(r.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(r.margen) ELSE 0 END,
         SUM(r.unidades)
  FROM public.resumen_cliente_mes r JOIN p ON p.cod_cliente = r.cod_cliente
  GROUP BY r.anio, r.mes ORDER BY r.anio, r.mes;
$$;

CREATE OR REPLACE FUNCTION public.panel_top_clientes(_anio integer, _limite integer DEFAULT 10)
RETURNS TABLE(cod_cliente integer, cliente text, vendedor text, importe numeric, margen numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid()))
  SELECT r.cod_cliente, COALESCE(c.cliente, 'Cliente ' || r.cod_cliente), c.vendedor,
         SUM(r.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(r.margen) ELSE 0 END
  FROM public.resumen_cliente_mes r
  JOIN p ON p.cod_cliente = r.cod_cliente
  LEFT JOIN public.clientes c ON c.cod_cliente = r.cod_cliente
  WHERE r.anio = _anio
  GROUP BY r.cod_cliente, c.cliente, c.vendedor
  ORDER BY SUM(r.importe) DESC
  LIMIT GREATEST(1, LEAST(_limite, 50));
$$;

CREATE OR REPLACE FUNCTION public.panel_top_familias(_anio integer, _limite integer DEFAULT 10)
RETURNS TABLE(familia text, importe numeric, margen numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid()))
  SELECT r.familia, SUM(r.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(r.margen) ELSE 0 END
  FROM public.resumen_cliente_familia r JOIN p ON p.cod_cliente = r.cod_cliente
  WHERE r.anio = _anio
  GROUP BY r.familia ORDER BY SUM(r.importe) DESC
  LIMIT GREATEST(1, LEAST(_limite, 50));
$$;

CREATE OR REPLACE FUNCTION public.panel_top_marcas(_anio integer, _limite integer DEFAULT 10)
RETURNS TABLE(marca text, importe numeric, margen numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid()))
  SELECT r.marca, SUM(r.importe),
         CASE WHEN public.puede_ver_margen(auth.uid()) THEN SUM(r.margen) ELSE 0 END
  FROM public.resumen_cliente_marca r JOIN p ON p.cod_cliente = r.cod_cliente
  WHERE r.anio = _anio
  GROUP BY r.marca ORDER BY SUM(r.importe) DESC
  LIMIT GREATEST(1, LEAST(_limite, 50));
$$;

CREATE OR REPLACE FUNCTION public.panel_alertas(_limite integer DEFAULT 15)
RETURNS TABLE(tipo text, cod_cliente integer, cliente text, vendedor text, valor numeric, valor_ref numeric, dias integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())),
  k AS (
    SELECT k.*, COALESCE(c.cliente, 'Cliente ' || k.cod_cliente) AS nombre, c.vendedor
    FROM public.cliente_kpis k
    JOIN p ON p.cod_cliente = k.cod_cliente
    LEFT JOIN public.clientes c ON c.cod_cliente = k.cod_cliente
  )
  (SELECT 'caida', cod_cliente, nombre, vendedor, importe_anio_actual, importe_anio_anterior_ytd, dias_sin_comprar
   FROM k WHERE importe_anio_anterior_ytd > 1000 AND importe_anio_actual < importe_anio_anterior_ytd * 0.8
   ORDER BY (importe_anio_anterior_ytd - importe_anio_actual) DESC LIMIT GREATEST(1, LEAST(_limite, 50)))
  UNION ALL
  (SELECT 'fuga', cod_cliente, nombre, vendedor, importe_total, importe_anio_anterior, dias_sin_comprar
   FROM k WHERE dias_sin_comprar > 90 AND importe_total > 1000
   ORDER BY importe_anio_anterior DESC LIMIT GREATEST(1, LEAST(_limite, 50)))
  UNION ALL
  (SELECT 'margen_bajo', cod_cliente, nombre, vendedor, importe_anio_actual,
          CASE WHEN importe_anio_actual > 0 THEN margen_anio_actual / importe_anio_actual * 100 ELSE 0 END, dias_sin_comprar
   FROM k WHERE public.puede_ver_margen(auth.uid()) AND importe_anio_actual > 5000
     AND margen_anio_actual / NULLIF(importe_anio_actual,0) < 0.20
   ORDER BY importe_anio_actual DESC LIMIT GREATEST(1, LEAST(_limite, 50)));
$$;

CREATE OR REPLACE FUNCTION public.panel_dormidos(_limite integer DEFAULT 25)
RETURNS TABLE(cod_cliente integer, cliente text, vendedor text, ultima_compra date, importe_total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid()))
  SELECT c.cod_cliente, c.cliente, c.vendedor, k.ultima_compra, COALESCE(k.importe_total, 0)
  FROM public.clientes c
  JOIN p ON p.cod_cliente = c.cod_cliente
  LEFT JOIN public.cliente_kpis k ON k.cod_cliente = c.cod_cliente
  WHERE k.cod_cliente IS NULL OR k.dias_sin_comprar > 365
  ORDER BY COALESCE(k.importe_total, 0) DESC, c.cliente
  LIMIT GREATEST(1, LEAST(_limite, 200));
$$;

-- Listado de clientes visibles con facturación y estado activo
CREATE OR REPLACE FUNCTION public.clientes_visibles(_solo_activos boolean DEFAULT true, _anios integer DEFAULT NULL)
RETURNS TABLE(
  cod_cliente integer, cliente text, ruta text, localidad text, vendedor text, delegacion text,
  importe_actual numeric, importe_anterior numeric, ultima_compra date, activo boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH cfg AS (
    SELECT COALESCE(_anios, (SELECT value::int FROM public.app_settings WHERE key = 'anios_cliente_activo'), 3) AS anios
  ),
  ref AS (SELECT COALESCE((SELECT max(anio) FROM public.resumen_cliente_mes), EXTRACT(YEAR FROM CURRENT_DATE)::int) AS anio),
  p AS (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid()))
  SELECT c.cod_cliente, c.cliente, c.ruta, c.localidad, c.vendedor, c.delegacion,
         COALESCE(k.importe_anio_actual, 0),
         COALESCE(k.importe_anio_anterior, 0),
         k.ultima_compra,
         (k.ultima_compra IS NOT NULL
           AND k.ultima_compra >= make_date((SELECT anio FROM ref) - (SELECT anios FROM cfg) + 1, 1, 1)) AS activo
  FROM public.clientes c
  JOIN p ON p.cod_cliente = c.cod_cliente
  LEFT JOIN public.cliente_kpis k ON k.cod_cliente = c.cod_cliente
  WHERE NOT _solo_activos
     OR (k.ultima_compra IS NOT NULL
         AND k.ultima_compra >= make_date((SELECT anio FROM ref) - (SELECT anios FROM cfg) + 1, 1, 1))
  ORDER BY COALESCE(k.importe_anio_actual, 0) DESC, c.cliente;
$$;

REVOKE ALL ON FUNCTION public.clientes_permitidos(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.panel_ventas_kpis() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.panel_ventas_mensual() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.panel_top_clientes(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.panel_top_familias(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.panel_top_marcas(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.panel_alertas(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.panel_dormidos(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clientes_visibles(boolean, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.panel_ventas_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_ventas_mensual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_top_clientes(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_top_familias(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_top_marcas(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_alertas(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_dormidos(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clientes_visibles(boolean, integer) TO authenticated;
