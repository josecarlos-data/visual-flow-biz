CREATE OR REPLACE FUNCTION public.panel_ventas_mensual()
RETURNS TABLE(anio integer, mes integer, importe numeric, margen numeric, unidades numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT anio, mes, SUM(importe), SUM(margen), SUM(unidades)
  FROM public.resumen_cliente_mes GROUP BY anio, mes ORDER BY anio, mes;
$$;

CREATE OR REPLACE FUNCTION public.panel_ventas_kpis()
RETURNS TABLE(anio integer, importe numeric, margen numeric, unidades numeric, clientes integer, lineas integer)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT anio, SUM(importe), SUM(margen), SUM(unidades), COUNT(DISTINCT cod_cliente)::int, SUM(lineas)::int
  FROM public.resumen_cliente_mes GROUP BY anio ORDER BY anio;
$$;

CREATE OR REPLACE FUNCTION public.panel_top_clientes(_anio integer, _limite integer DEFAULT 10)
RETURNS TABLE(cod_cliente integer, cliente text, vendedor text, importe numeric, margen numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT r.cod_cliente, COALESCE(c.cliente, 'Cliente ' || r.cod_cliente), c.vendedor,
         SUM(r.importe), SUM(r.margen)
  FROM public.resumen_cliente_mes r
  LEFT JOIN public.clientes c ON c.cod_cliente = r.cod_cliente
  WHERE r.anio = _anio
  GROUP BY r.cod_cliente, c.cliente, c.vendedor
  ORDER BY SUM(r.importe) DESC
  LIMIT GREATEST(1, LEAST(_limite, 50));
$$;

CREATE OR REPLACE FUNCTION public.panel_top_familias(_anio integer, _limite integer DEFAULT 10)
RETURNS TABLE(familia text, importe numeric, margen numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT familia, SUM(importe), SUM(margen) FROM public.resumen_cliente_familia
  WHERE anio = _anio GROUP BY familia ORDER BY SUM(importe) DESC LIMIT GREATEST(1, LEAST(_limite, 50));
$$;

CREATE OR REPLACE FUNCTION public.panel_top_marcas(_anio integer, _limite integer DEFAULT 10)
RETURNS TABLE(marca text, importe numeric, margen numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT marca, SUM(importe), SUM(margen) FROM public.resumen_cliente_marca
  WHERE anio = _anio GROUP BY marca ORDER BY SUM(importe) DESC LIMIT GREATEST(1, LEAST(_limite, 50));
$$;

CREATE OR REPLACE FUNCTION public.panel_alertas(_limite integer DEFAULT 15)
RETURNS TABLE(tipo text, cod_cliente integer, cliente text, vendedor text,
              valor numeric, valor_ref numeric, dias integer)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH k AS (
    SELECT k.*, COALESCE(c.cliente, 'Cliente ' || k.cod_cliente) AS nombre, c.vendedor
    FROM public.cliente_kpis k
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
   FROM k WHERE importe_anio_actual > 5000
     AND margen_anio_actual / NULLIF(importe_anio_actual,0) < 0.20
   ORDER BY importe_anio_actual DESC LIMIT GREATEST(1, LEAST(_limite, 50)));
$$;

CREATE OR REPLACE FUNCTION public.panel_dormidos(_limite integer DEFAULT 25)
RETURNS TABLE(cod_cliente integer, cliente text, vendedor text, ultima_compra date, importe_total numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT c.cod_cliente, c.cliente, c.vendedor, k.ultima_compra, COALESCE(k.importe_total, 0)
  FROM public.clientes c
  LEFT JOIN public.cliente_kpis k ON k.cod_cliente = c.cod_cliente
  WHERE k.cod_cliente IS NULL OR k.dias_sin_comprar > 365
  ORDER BY COALESCE(k.importe_total, 0) DESC, c.cliente
  LIMIT GREATEST(1, LEAST(_limite, 200));
$$;

GRANT EXECUTE ON FUNCTION public.panel_ventas_mensual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_ventas_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_top_clientes(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_top_familias(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_top_marcas(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_alertas(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_dormidos(integer) TO authenticated;