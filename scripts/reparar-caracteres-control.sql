-- Reparación de caracteres de control en public.visita_bloques (campos / campos_meta).
-- NO EJECUTADO: pendiente de visto bueno.
--
-- Recuento a 12/08/2026: 2 bloques, 3 campos afectados (todos en informacion_potencial).
--   7e22a21a-c8f7-4fff-a490-e2a9ce5a1612  tipo_trabajo       "Reparaci<1F>3n de camiones..."
--   7e22a21a-c8f7-4fff-a490-e2a9ce5a1612  segmento_vehiculo  "Cami<1F>3n | Turismo"
--   dca48fe7-1e0b-4074-82d7-a105e4915855  segmento_vehiculo  "Cami<03>n | Remolque/Plataforma | Frigor<03>fico"
-- En campos_meta: 0 casos.
--
-- Patrón detectado: la secuencia UTF-8 de una vocal acentuada se corrompe.
--   C3 B3 ("ó") -> 1F 33  ó  -> 03
--   C3 AD ("í") -> 03 (en "Frigorfico")
-- Por eso la reparación restaura primero los patrones conocidos y solo después
-- elimina cualquier carácter de control residual.

BEGIN;

-- 1) Copia de seguridad de los bloques afectados antes de tocar nada.
CREATE TABLE IF NOT EXISTS public.visita_bloques_backup_cntrl AS
SELECT b.id, b.campos, b.campos_meta, now() AS copiado_en
FROM public.visita_bloques b
WHERE EXISTS (SELECT 1 FROM jsonb_each_text(b.campos) kv WHERE kv.value ~ '[[:cntrl:]]')
   OR EXISTS (SELECT 1 FROM jsonb_each_text(b.campos_meta) kv WHERE kv.value ~ '[[:cntrl:]]');

-- 2) Función de saneado: restaura los patrones conocidos, borra el resto de
--    caracteres de control (salvo tabulador y salto de línea) y normaliza a NFC.
CREATE OR REPLACE FUNCTION public.sanear_texto_visita(_t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT normalize(
    regexp_replace(
      replace(replace(replace(replace(replace(_t,
        chr(31) || '3', 'ó'),
        'Cami' || chr(3) || 'n', 'Camión'),
        'Frigor' || chr(3) || 'fico', 'Frigorífico'),
        'Reparaci' || chr(3) || 'n', 'Reparación'),
        'Informaci' || chr(3) || 'n', 'Información'),
      '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'),
    NFC);
$$;

-- 3) Reescritura de campos y campos_meta (solo las filas afectadas).
UPDATE public.visita_bloques b
   SET campos = (
         SELECT COALESCE(jsonb_object_agg(kv.key, public.sanear_texto_visita(kv.value)), '{}'::jsonb)
         FROM jsonb_each_text(b.campos) kv)
 WHERE EXISTS (SELECT 1 FROM jsonb_each_text(b.campos) kv WHERE kv.value ~ '[[:cntrl:]]');

UPDATE public.visita_bloques b
   SET campos_meta = (
         SELECT COALESCE(jsonb_object_agg(kv.key, kv.value), '{}'::jsonb)
         FROM (
           SELECT m.key,
                  (SELECT jsonb_object_agg(i.key, to_jsonb(public.sanear_texto_visita(i.value)))
                     FROM jsonb_each_text(m.value) i) AS value
           FROM jsonb_each(b.campos_meta) m
         ) kv)
 WHERE EXISTS (SELECT 1 FROM jsonb_each_text(b.campos_meta) kv WHERE kv.value ~ '[[:cntrl:]]');

-- 4) Verificación: debe devolver 0.
SELECT count(*) AS quedan
FROM public.visita_bloques b
WHERE EXISTS (SELECT 1 FROM jsonb_each_text(b.campos) kv WHERE kv.value ~ '[[:cntrl:]]')
   OR EXISTS (SELECT 1 FROM jsonb_each_text(b.campos_meta) kv WHERE kv.value ~ '[[:cntrl:]]');

COMMIT;
