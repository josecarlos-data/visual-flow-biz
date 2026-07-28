CREATE OR REPLACE FUNCTION public.upsert_clientes_maestro(_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  INSERT INTO public.clientes (cod_cliente, cliente, vendedor, cod_vendedor, delegacion)
  SELECT (r->>'cod_cliente')::int,
         COALESCE(NULLIF(r->>'cliente',''), 'CLIENTE ' || (r->>'cod_cliente')),
         NULLIF(r->>'vendedor',''), NULLIF(r->>'cod_vendedor',''), NULLIF(r->>'delegacion','')
  FROM jsonb_array_elements(_rows) r
  ON CONFLICT (cod_cliente) DO UPDATE SET
    cliente = EXCLUDED.cliente,
    vendedor = COALESCE(EXCLUDED.vendedor, public.clientes.vendedor),
    cod_vendedor = COALESCE(EXCLUDED.cod_vendedor, public.clientes.cod_vendedor),
    delegacion = COALESCE(EXCLUDED.delegacion, public.clientes.delegacion),
    updated_at = now();
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.upsert_productos_maestro(_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  INSERT INTO public.productos (referencia, descripcion, familia, marca, familia_marca)
  SELECT r->>'referencia', NULLIF(r->>'descripcion',''), NULLIF(r->>'familia',''), NULLIF(r->>'marca',''), NULLIF(r->>'familia_marca','')
  FROM jsonb_array_elements(_rows) r
  ON CONFLICT (referencia) DO UPDATE SET
    descripcion = COALESCE(EXCLUDED.descripcion, public.productos.descripcion),
    familia = COALESCE(EXCLUDED.familia, public.productos.familia),
    marca = COALESCE(EXCLUDED.marca, public.productos.marca),
    familia_marca = COALESCE(EXCLUDED.familia_marca, public.productos.familia_marca),
    updated_at = now();
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.insertar_ventas_diarias(_rows jsonb, _reset boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _reset THEN TRUNCATE public.ventas_diarias; END IF;
  INSERT INTO public.ventas_diarias (cod_cliente, referencia, marca, familia, fecha, unidades, importe, margen)
  SELECT (r->>'cod_cliente')::int, r->>'referencia', NULLIF(r->>'marca',''), NULLIF(r->>'familia',''),
         (r->>'fecha')::date, COALESCE((r->>'unidades')::numeric,0), COALESCE((r->>'importe')::numeric,0), COALESCE((r->>'margen')::numeric,0)
  FROM jsonb_array_elements(_rows) r;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.marcar_top_truck(_cods jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.clientes SET top_truck = NULL WHERE top_truck IS NOT NULL;
  UPDATE public.clientes SET top_truck = 'SI', updated_at = now()
  WHERE cod_cliente IN (SELECT (value)::text::int FROM jsonb_array_elements_text(_cods) value);
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.refrescar_resumenes_admin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  PERFORM public.refrescar_resumenes_ventas();
END; $$;

REVOKE ALL ON FUNCTION public.upsert_clientes_maestro(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_productos_maestro(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.insertar_ventas_diarias(jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marcar_top_truck(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refrescar_resumenes_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_clientes_maestro(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_productos_maestro(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.insertar_ventas_diarias(jsonb, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.marcar_top_truck(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refrescar_resumenes_admin() TO authenticated, service_role;