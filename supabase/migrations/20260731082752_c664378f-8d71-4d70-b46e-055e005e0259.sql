CREATE OR REPLACE FUNCTION public.registrar_geo_cliente(_cod integer, _lat numeric, _lng numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _lat IS NULL OR _lng IS NULL THEN RETURN false; END IF;
  IF _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN RETURN false; END IF;
  IF NOT public.can_view_cliente(auth.uid(), _cod) THEN RETURN false; END IF;

  UPDATE public.clientes
     SET latitud = _lat, longitud = _lng, updated_at = now()
   WHERE cod_cliente = _cod AND (latitud IS NULL OR longitud IS NULL);

  RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION public.registrar_geo_cliente(integer, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_geo_cliente(integer, numeric, numeric) TO authenticated;