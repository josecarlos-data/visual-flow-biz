CREATE OR REPLACE FUNCTION public.refrescar_resumenes_ventas()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_max date; v_anio integer; v_mes integer; v_dia integer;
BEGIN
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
  SELECT cod_cliente, EXTRACT(YEAR FROM fecha)::int, COALESCE(familia,'SIN'), SUM(importe), SUM(margen), SUM(unidades), MAX(fecha)
  FROM public.ventas_diarias GROUP BY 1,2,3;

  TRUNCATE public.resumen_cliente_marca;
  INSERT INTO public.resumen_cliente_marca (cod_cliente, anio, marca, importe, margen, unidades)
  SELECT cod_cliente, EXTRACT(YEAR FROM fecha)::int, COALESCE(marca,'SIN'), SUM(importe), SUM(margen), SUM(unidades)
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
$$;
REVOKE ALL ON FUNCTION public.refrescar_resumenes_ventas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refrescar_resumenes_ventas() TO service_role;