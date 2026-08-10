-- Normalizador numérico tolerante (comas decimales, símbolo de moneda, miles con punto)
CREATE OR REPLACE FUNCTION public.to_num_visita(_v text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE s text;
BEGIN
  IF _v IS NULL THEN RETURN NULL; END IF;
  s := regexp_replace(_v, '[^0-9,.\-]', '', 'g');
  IF s = '' THEN RETURN NULL; END IF;
  IF position(',' in s) > 0 AND position('.' in s) > 0 THEN
    s := replace(replace(s, '.', ''), ',', '.');
  ELSIF position(',' in s) > 0 THEN
    s := replace(s, ',', '.');
  END IF;
  BEGIN
    RETURN s::numeric;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.to_date_visita(_v text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF _v IS NULL OR btrim(_v) = '' THEN RETURN NULL; END IF;
  BEGIN
    RETURN btrim(_v)::date;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.to_num_visita(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.to_date_visita(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.to_num_visita(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.to_date_visita(text) TO authenticated, service_role;

-- 1) Vista base en formato largo: una fila por bloque y campo relleno
DROP VIEW IF EXISTS public.v_visita_bloques_campos CASCADE;
CREATE VIEW public.v_visita_bloques_campos
WITH (security_invoker = true) AS
SELECT
  v.id            AS visita_id,
  b.id            AS bloque_id,
  v.cod_cliente,
  v.fecha,
  v.hora,
  v.vendedor,
  v.ruta,
  v.zona,
  v.tipo,
  v.origen,
  v.estado,
  b.motivo_key,
  b.orden         AS bloque_orden,
  kv.key          AS campo_key,
  btrim(kv.value) AS valor_texto,
  public.to_num_visita(kv.value)  AS valor_num,
  public.to_date_visita(kv.value) AS valor_fecha,
  b.campos_meta -> kv.key ->> 'confianza' AS confianza,
  b.campos_meta -> kv.key ->> 'cita'      AS cita,
  b.validacion,
  b.nota_revision,
  b.completo,
  b.created_at    AS bloque_created_at
FROM public.visita_bloques b
JOIN public.visitas v ON v.id = b.visita_id
CROSS JOIN LATERAL jsonb_each_text(b.campos) AS kv(key, value)
WHERE nullif(btrim(kv.value), '') IS NOT NULL;

GRANT SELECT ON public.v_visita_bloques_campos TO authenticated;

-- 2) Ofertas (bloques de promoción)
DROP VIEW IF EXISTS public.v_visita_oferta;
CREATE VIEW public.v_visita_oferta
WITH (security_invoker = true) AS
SELECT
  v.id AS visita_id,
  b.id AS bloque_id,
  v.cod_cliente,
  v.fecha,
  v.vendedor,
  v.ruta,
  v.zona,
  v.origen,
  b.campos ->> 'referencia'          AS referencia,
  b.campos ->> 'producto'            AS producto,
  public.to_num_visita(b.campos ->> 'cantidad')         AS cantidad,
  public.to_num_visita(b.campos ->> 'precio_ofertado')  AS precio_ofertado,
  b.campos ->> 'canal_envio'         AS canal_envio,
  b.campos ->> 'respuesta_cliente'   AS respuesta_cliente,
  public.to_num_visita(b.campos ->> 'importe_estimado') AS importe_estimado,
  b.campos ->> 'proxima_accion'      AS proxima_accion,
  (lower(coalesce(b.campos ->> 'fuera_de_plazo', '')) IN ('si', 'sí', 'true')) AS fuera_de_plazo,
  b.campos ->> 'motivo_fuera_plazo'  AS motivo_fuera_plazo,
  b.validacion,
  b.nota_revision,
  b.completo,
  b.created_at
FROM public.visita_bloques b
JOIN public.visitas v ON v.id = b.visita_id
WHERE b.motivo_key = 'promocion';

GRANT SELECT ON public.v_visita_oferta TO authenticated;

-- 3) Competencia, con gap en euros y en porcentaje
DROP VIEW IF EXISTS public.v_visita_competencia;
CREATE VIEW public.v_visita_competencia
WITH (security_invoker = true) AS
SELECT
  v.id AS visita_id,
  b.id AS bloque_id,
  v.cod_cliente,
  v.fecha,
  v.vendedor,
  v.ruta,
  v.zona,
  v.origen,
  b.campos ->> 'competidor'             AS competidor,
  b.campos ->> 'marca_competencia'      AS marca_competencia,
  b.campos ->> 'referencia_competencia' AS referencia_competencia,
  public.to_num_visita(b.campos ->> 'precio_rimosa')      AS precio_rimosa,
  public.to_num_visita(b.campos ->> 'precio_competencia') AS precio_competencia,
  public.to_num_visita(b.campos ->> 'precio_rimosa')
    - public.to_num_visita(b.campos ->> 'precio_competencia') AS gap_eur,
  round(
    (public.to_num_visita(b.campos ->> 'precio_rimosa')
      - public.to_num_visita(b.campos ->> 'precio_competencia'))
    / nullif(public.to_num_visita(b.campos ->> 'precio_competencia'), 0) * 100,
    2
  ) AS gap_pct,
  b.campos ->> 'resultado_venta' AS resultado_venta,
  b.campos ->> 'conclusion'      AS conclusion,
  b.validacion,
  b.nota_revision,
  b.completo,
  b.created_at
FROM public.visita_bloques b
JOIN public.visitas v ON v.id = b.visita_id
WHERE b.motivo_key = 'competencia';

GRANT SELECT ON public.v_visita_competencia TO authenticated;

-- 4) Próximas acciones, transversal a todos los motivos
DROP VIEW IF EXISTS public.v_visita_accion_pendiente;
CREATE VIEW public.v_visita_accion_pendiente
WITH (security_invoker = true) AS
SELECT
  v.id AS visita_id,
  b.id AS bloque_id,
  v.cod_cliente,
  c.cliente,
  v.fecha,
  v.vendedor,
  v.ruta,
  v.zona,
  b.motivo_key,
  btrim(b.campos ->> 'proxima_accion') AS proxima_accion,
  public.to_date_visita(
    coalesce(b.campos ->> 'fecha_proxima_accion', b.campos ->> 'fecha_compromiso')
  ) AS fecha_accion,
  b.validacion,
  b.created_at
FROM public.visita_bloques b
JOIN public.visitas v ON v.id = b.visita_id
LEFT JOIN public.clientes c ON c.cod_cliente = v.cod_cliente
WHERE nullif(btrim(coalesce(b.campos ->> 'proxima_accion', '')), '') IS NOT NULL;

GRANT SELECT ON public.v_visita_accion_pendiente TO authenticated;

-- 5) Ficha de flota: último valor NO NULO de cada campo, campo a campo
DROP VIEW IF EXISTS public.v_ficha_flota_actual;
CREATE VIEW public.v_ficha_flota_actual
WITH (security_invoker = true) AS
WITH ult AS (
  SELECT DISTINCT ON (cod_cliente, campo_key)
    cod_cliente, campo_key, valor_texto, valor_num, fecha, visita_id, bloque_created_at
  FROM public.v_visita_bloques_campos
  WHERE motivo_key = 'informacion_potencial' AND cod_cliente IS NOT NULL
  ORDER BY cod_cliente, campo_key, fecha DESC NULLS LAST, bloque_created_at DESC
)
SELECT
  cod_cliente,
  max(valor_texto) FILTER (WHERE campo_key = 'persona_contacto')    AS persona_contacto,
  max(valor_num)   FILTER (WHERE campo_key = 'num_vehiculos')       AS num_vehiculos,
  max(valor_texto) FILTER (WHERE campo_key = 'marcas_vehiculo')     AS marcas_vehiculo,
  max(valor_texto) FILTER (WHERE campo_key = 'tipo_ejes')           AS tipo_ejes,
  max(valor_num)   FILTER (WHERE campo_key = 'num_mecanicos')       AS num_mecanicos,
  max(valor_texto) FILTER (WHERE campo_key = 'tipo_trabajo')        AS tipo_trabajo,
  max(valor_texto) FILTER (WHERE campo_key = 'referencias_consumo') AS referencias_consumo,
  max(valor_num)   FILTER (WHERE campo_key = 'potencial_estimado')  AS potencial_estimado,
  max(valor_texto) FILTER (WHERE campo_key = 'observaciones')       AS observaciones,
  max(fecha)                                                        AS fecha_ultima_actualizacion,
  (array_agg(visita_id ORDER BY fecha DESC NULLS LAST, bloque_created_at DESC))[1] AS visita_id_origen
FROM ult
GROUP BY cod_cliente;

GRANT SELECT ON public.v_ficha_flota_actual TO authenticated;