-- Reparación de caracteres de control en public.visita_bloques (campos).
-- NO EJECUTADO: pendiente de visto bueno.
--
-- Recuento a 12/08/2026: 2 bloques, 3 campos afectados (todos en informacion_potencial).
--   7e22a21a-c8f7-4fff-a490-e2a9ce5a1612  tipo_trabajo       "Reparaci<1F>3n de camiones..."
--   7e22a21a-c8f7-4fff-a490-e2a9ce5a1612  segmento_vehiculo  "Cami<1F>3n | Turismo"
--   dca48fe7-1e0b-4074-82d7-a105e4915855  segmento_vehiculo  "Cami<03>n | Remolque/Plataforma | Frigor<03>fico"
-- En campos_meta: 0 casos.
--
-- IMPORTANTE: no se borra el carácter de control. La secuencia UTF-8 de la vocal
-- acentuada se corrompió (C3 B3 -> 1F 33, y C3 B3 / C3 AD -> 03), así que borrarlo
-- dejaría "Reparaci3n" o "Camin". Además segmento_vehiculo valida contra la lista de
-- opciones del campo, y un valor huérfano desaparecería de filtros y análisis.
-- Por eso se escribe directamente el valor final correcto, campo a campo.

BEGIN;

-- 1) Copia de seguridad de los bloques afectados antes de tocar nada.
CREATE TABLE IF NOT EXISTS public.visita_bloques_backup_cntrl AS
SELECT b.id, b.campos, b.campos_meta, now() AS copiado_en
FROM public.visita_bloques b
WHERE EXISTS (SELECT 1 FROM jsonb_each_text(b.campos) kv WHERE kv.value ~ '[[:cntrl:]]')
   OR EXISTS (SELECT 1 FROM jsonb_each_text(b.campos_meta) kv WHERE kv.value ~ '[[:cntrl:]]');

-- 2) Comprobación previa: los valores destino existen en el catálogo del campo
--    segmento_vehiculo (multiselect separado por " | "). Debe devolver 0 filas.
SELECT v AS valor_fuera_de_catalogo
FROM unnest(ARRAY['Camión','Turismo','Remolque/Plataforma','Frigorífico']) v
WHERE NOT EXISTS (
  SELECT 1
  FROM public.motivo_campos mc,
       jsonb_array_elements_text(mc.opciones) o
  WHERE mc.campo_key = 'segmento_vehiculo' AND o = v);

-- 3) Escritura explícita del valor final correcto.
UPDATE public.visita_bloques
   SET campos = campos
       || jsonb_build_object(
            'tipo_trabajo', 'Reparación de camiones y algo de turismo; reparación de traseras',
            'segmento_vehiculo', 'Camión | Turismo')
 WHERE id = '7e22a21a-c8f7-4fff-a490-e2a9ce5a1612';

UPDATE public.visita_bloques
   SET campos = campos
       || jsonb_build_object('segmento_vehiculo', 'Camión | Remolque/Plataforma | Frigorífico')
 WHERE id = 'dca48fe7-1e0b-4074-82d7-a105e4915855';

-- 4) Verificación posterior: ningún carácter de control y ningún valor de
--    segmento_vehiculo fuera de catálogo. Ambas consultas deben devolver 0.
SELECT count(*) AS quedan_con_control
FROM public.visita_bloques b
WHERE EXISTS (SELECT 1 FROM jsonb_each_text(b.campos) kv WHERE kv.value ~ '[[:cntrl:]]')
   OR EXISTS (SELECT 1 FROM jsonb_each_text(b.campos_meta) kv WHERE kv.value ~ '[[:cntrl:]]');

SELECT count(*) AS segmentos_huerfanos
FROM public.visita_bloques b,
     LATERAL unnest(string_to_array(b.campos->>'segmento_vehiculo', ' | ')) v
WHERE b.campos ? 'segmento_vehiculo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.motivo_campos mc,
         jsonb_array_elements_text(mc.opciones) o
    WHERE mc.campo_key = 'segmento_vehiculo' AND o = trim(v));

COMMIT;
