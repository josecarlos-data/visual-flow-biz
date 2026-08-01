-- 1. Tabla de objetivos
CREATE TABLE public.objetivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio integer NOT NULL,
  tipo text NOT NULL DEFAULT 'cartera',
  vendedor text NOT NULL,
  cod_vendedor text,
  ruta text,
  importe_objetivo numeric NOT NULL DEFAULT 0,
  base_anio_anterior numeric NOT NULL DEFAULT 0,
  porcentaje numeric NOT NULL DEFAULT 0,
  nota text,
  activo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX objetivos_unicos ON public.objetivos (anio, tipo, vendedor, COALESCE(ruta, ''));
CREATE INDEX objetivos_anio_idx ON public.objetivos (anio, activo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.objetivos TO authenticated;
GRANT ALL ON public.objetivos TO service_role;

ALTER TABLE public.objetivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Objetivos visibles segun rol"
ON public.objetivos FOR SELECT TO authenticated
USING (
  public.is_approved(auth.uid()) AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'director_comercial')
    OR (public.has_role(auth.uid(), 'jefe_de_zona') AND EXISTS (
          SELECT 1 FROM public.clientes c
          WHERE c.vendedor = objetivos.vendedor
            AND c.delegacion = public.get_user_delegacion(auth.uid())))
    OR vendedor = public.get_user_employee_code(auth.uid())
  )
);

CREATE POLICY "Direccion gestiona objetivos"
ON public.objetivos FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'director_comercial'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'director_comercial'));

CREATE TRIGGER objetivos_updated_at
BEFORE UPDATE ON public.objetivos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Helpers de quincenas
CREATE OR REPLACE FUNCTION public.quincena_de(_f date)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT (EXTRACT(MONTH FROM _f)::int - 1) * 2 + CASE WHEN EXTRACT(DAY FROM _f)::int <= 15 THEN 1 ELSE 2 END;
$$;

CREATE OR REPLACE FUNCTION public.fecha_corte_datos()
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(max(fecha), CURRENT_DATE) FROM public.ventas_diarias;
$$;

-- Ultima quincena CERRADA y CARGADA para un año dado (0 = ninguna, 24 = año completo)
CREATE OR REPLACE FUNCTION public.quincena_corte(_anio integer)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_max date; v_anio int; v_mes int; v_dia int; v_ultimo int;
BEGIN
  v_max := public.fecha_corte_datos();
  v_anio := EXTRACT(YEAR FROM v_max)::int;
  IF _anio < v_anio THEN RETURN 24; END IF;
  IF _anio > v_anio THEN RETURN 0; END IF;
  v_mes := EXTRACT(MONTH FROM v_max)::int;
  v_dia := EXTRACT(DAY FROM v_max)::int;
  v_ultimo := EXTRACT(DAY FROM (date_trunc('month', v_max) + interval '1 month - 1 day'))::int;
  IF v_dia >= v_ultimo THEN RETURN v_mes * 2; END IF;
  IF v_dia >= 15 THEN RETURN v_mes * 2 - 1; END IF;
  RETURN (v_mes - 1) * 2;
END; $$;

GRANT EXECUTE ON FUNCTION public.quincena_de(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fecha_corte_datos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.quincena_corte(integer) TO authenticated;

-- 3. Seguimiento de objetivos
CREATE OR REPLACE FUNCTION public.objetivos_seguimiento(_anio integer)
RETURNS TABLE(
  id uuid, tipo text, vendedor text, cod_vendedor text, ruta text,
  importe_objetivo numeric, nota text, activo boolean,
  vendido numeric, vendido_anterior_ytd numeric, total_anterior numeric,
  quincena_corte integer, fecha_corte date, series jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_q int; v_f date;
BEGIN
  IF NOT public.is_approved(auth.uid()) THEN RETURN; END IF;
  v_q := public.quincena_corte(_anio);
  v_f := public.fecha_corte_datos();

  RETURN QUERY
  WITH obj AS (
    SELECT o.* FROM public.objetivos o WHERE o.anio = _anio
  ),
  rutas_obj AS (
    SELECT DISTINCT o.ruta FROM obj o WHERE o.tipo = 'ruta' AND o.activo AND o.ruta IS NOT NULL
  ),
  ventas AS (
    SELECT c.vendedor AS vend,
           NULLIF(c.ruta_especial, '') AS ruta_esp,
           EXTRACT(YEAR FROM v.fecha)::int AS anio,
           public.quincena_de(v.fecha) AS q,
           SUM(v.importe) AS importe
    FROM public.ventas_diarias v
    JOIN public.clientes c ON c.cod_cliente = v.cod_cliente
    WHERE EXTRACT(YEAR FROM v.fecha)::int IN (_anio, _anio - 1)
      AND c.vendedor IS NOT NULL AND c.vendedor <> ''
    GROUP BY 1,2,3,4
  ),
  agg AS (
    SELECT o.id, ve.anio, ve.q, SUM(ve.importe) AS importe
    FROM obj o
    JOIN ventas ve ON ve.vend = o.vendedor
      AND (
        (o.tipo = 'ruta' AND ve.ruta_esp = o.ruta)
        OR (o.tipo = 'cartera' AND (ve.ruta_esp IS NULL OR ve.ruta_esp NOT IN (SELECT r.ruta FROM rutas_obj r)))
      )
    GROUP BY 1,2,3
  ),
  serie AS (
    SELECT a.id,
           jsonb_agg(jsonb_build_object('q', a.q, 'anio', a.anio, 'importe', a.importe) ORDER BY a.anio, a.q) AS series
    FROM agg a GROUP BY a.id
  )
  SELECT o.id, o.tipo, o.vendedor, o.cod_vendedor, o.ruta,
         o.importe_objetivo, o.nota, o.activo,
         COALESCE((SELECT SUM(a.importe) FROM agg a WHERE a.id = o.id AND a.anio = _anio), 0),
         COALESCE((SELECT SUM(a.importe) FROM agg a WHERE a.id = o.id AND a.anio = _anio - 1 AND a.q <= v_q), 0),
         COALESCE((SELECT SUM(a.importe) FROM agg a WHERE a.id = o.id AND a.anio = _anio - 1), 0),
         v_q, v_f, COALESCE(s.series, '[]'::jsonb)
  FROM obj o
  LEFT JOIN serie s ON s.id = o.id
  ORDER BY o.tipo, o.vendedor, o.ruta NULLS FIRST;
END; $$;

-- 4. Propuesta de objetivos a partir del año anterior
CREATE OR REPLACE FUNCTION public.objetivos_propuesta(_anio integer, _pct numeric DEFAULT 5)
RETURNS TABLE(tipo text, vendedor text, cod_vendedor text, ruta text, base_anio_anterior numeric, importe_sugerido numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'director_comercial')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.vendedor AS vend, MIN(c.cod_vendedor) AS cod,
           NULLIF(c.ruta_especial, '') AS ruta_esp, SUM(v.importe) AS importe
    FROM public.ventas_diarias v
    JOIN public.clientes c ON c.cod_cliente = v.cod_cliente
    WHERE EXTRACT(YEAR FROM v.fecha)::int = _anio - 1
      AND c.vendedor IS NOT NULL AND c.vendedor <> ''
    GROUP BY 1,3
  )
  (SELECT 'cartera'::text, b.vend, MIN(b.cod), NULL::text,
          ROUND(SUM(b.importe), 2), ROUND(SUM(b.importe) * (1 + _pct / 100.0), 2)
   FROM base b WHERE b.ruta_esp IS NULL GROUP BY b.vend)
  UNION ALL
  (SELECT 'ruta'::text, b.vend, MIN(b.cod), b.ruta_esp,
          ROUND(SUM(b.importe), 2), ROUND(SUM(b.importe), 2)
   FROM base b WHERE b.ruta_esp IS NOT NULL GROUP BY b.vend, b.ruta_esp)
  ORDER BY 1, 2, 4 NULLS FIRST;
END; $$;

GRANT EXECUTE ON FUNCTION public.objetivos_seguimiento(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.objetivos_propuesta(integer, numeric) TO authenticated;

-- 5. Vendedores disponibles para asignar objetivos
CREATE OR REPLACE FUNCTION public.vendedores_objetivos()
RETURNS TABLE(vendedor text, cod_vendedor text, clientes integer, ruta_especial text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.vendedor, MIN(c.cod_vendedor), COUNT(*)::int, NULLIF(c.ruta_especial,'')
  FROM public.clientes c
  WHERE c.vendedor IS NOT NULL AND c.vendedor <> ''
    AND public.is_approved(auth.uid())
  GROUP BY c.vendedor, NULLIF(c.ruta_especial,'')
  ORDER BY c.vendedor;
$$;

GRANT EXECUTE ON FUNCTION public.vendedores_objetivos() TO authenticated;