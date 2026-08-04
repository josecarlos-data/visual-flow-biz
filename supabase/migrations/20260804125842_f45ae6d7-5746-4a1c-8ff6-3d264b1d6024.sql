CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS observaciones_original text;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS observaciones_repartidas boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.repartir_observaciones_gespromo(_forzar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  r record;
  lineas text[];
  l1 text;
  raw1 text;
  norm1 text;
  tok1 text;
  tok2 text;
  m text[];
  veredicto text;
  resto_marca text;
  nota text;
  obs text;
  i int;
  n_proc int := 0;
  n_correcto int := 0;
  n_no_correcto int := 0;
  n_pendiente int := 0;
  dudosas text[] := ARRAY[]::text[];
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  -- 1) copia de seguridad del texto original (solo la primera vez)
  UPDATE public.visitas SET observaciones_original = observaciones
  WHERE observaciones_original IS NULL AND observaciones IS NOT NULL;

  FOR r IN
    SELECT v.id, v.observaciones_original AS origen
    FROM public.visitas v
    WHERE _forzar OR NOT v.observaciones_repartidas
  LOOP
    veredicto := 'pendiente';
    nota := NULL;
    obs := NULL;

    IF r.origen IS NOT NULL AND btrim(r.origen) <> '' THEN
      lineas := regexp_split_to_array(replace(r.origen, E'\r', ''), E'\n');
      raw1 := btrim(coalesce(lineas[1], ''));
      norm1 := btrim(regexp_replace(
                 regexp_replace(
                   upper(translate(raw1, 'áéíóúàèìòùÁÉÍÓÚÀÈÌÒÙñÑüÜçÇ', 'aeiouaeiouAEIOUAEIOUnNuUcC')),
                 '[^A-Z ]', ' ', 'g'), '\s+', ' ', 'g'));
      tok1 := split_part(norm1, ' ', 1);
      tok2 := split_part(norm1, ' ', 2);
      resto_marca := NULL;

      -- 2) marcador del director: PRIMERO la negación (NO CORRECTO contiene CORRECTO)
      m := regexp_match(raw1, '^\s*(N\s?O\s?(?:ES\s+)?C[A-Z]{4,10})\s*(.*)$');
      IF m IS NOT NULL THEN
        veredicto := 'NO CORRECTO';
        resto_marca := btrim(regexp_replace(m[2], '^[\s/\-–:,\.]+', ''));
      ELSE
        m := regexp_match(raw1, '^\s*(C[A-Z]{4,10})\s*(.*)$');
        IF m IS NOT NULL THEN
          veredicto := 'CORRECTO';
          resto_marca := btrim(regexp_replace(m[2], '^[\s/\-–:,\.]+', ''));
        ELSIF raw1 = upper(raw1) AND length(norm1) BETWEEN 4 AND 30 THEN
          -- 3) red de seguridad difusa para erratas no previstas
          IF tok1 IN ('N','NO') AND tok2 <> '' AND extensions.levenshtein(tok2, 'CORRECTO') <= 3 THEN
            veredicto := 'NO CORRECTO'; resto_marca := '';
          ELSIF extensions.levenshtein(tok1, 'NOCORRECTO') <= 3 THEN
            veredicto := 'NO CORRECTO'; resto_marca := btrim(substr(raw1, length(split_part(raw1,' ',1)) + 1));
          ELSIF extensions.levenshtein(tok1, 'CORRECTO') <= 3 THEN
            veredicto := 'CORRECTO'; resto_marca := btrim(substr(raw1, length(split_part(raw1,' ',1)) + 1));
          ELSIF array_length(dudosas, 1) IS NULL OR array_length(dudosas, 1) < 50 THEN
            dudosas := dudosas || raw1;
          END IF;
        END IF;
      END IF;

      IF veredicto = 'pendiente' AND resto_marca IS NULL THEN
        i := 1;                     -- sin marcador: todo el texto es del comercial
      ELSE
        i := 2;
        IF resto_marca IS NOT NULL AND resto_marca <> '' THEN
          nota := resto_marca;
        END IF;
        -- 4) párrafos íntegros en MAYÚSCULAS pegados al marcador -> nota de revisión
        WHILE i <= coalesce(array_length(lineas, 1), 0) LOOP
          l1 := btrim(coalesce(lineas[i], ''));
          IF l1 = '' THEN
            EXIT WHEN nota IS NULL;      -- línea en blanco antes de la nota: no hay nota
            i := i + 1;
            CONTINUE;
          END IF;
          EXIT WHEN l1 <> upper(l1) OR l1 !~ '[A-ZÁÉÍÓÚÑ]';
          nota := btrim(coalesce(nota || ' ', '') || l1);
          i := i + 1;
        END LOOP;
      END IF;

      -- 5) el resto es el texto del comercial
      obs := btrim(array_to_string(lineas[i:coalesce(array_length(lineas, 1), 0)], E'\n'));
      IF obs = '' THEN obs := NULL; END IF;
    END IF;

    -- el marcador se escribe SOLO en el bloque; visitas.validacion la deriva el agregado
    UPDATE public.visita_bloques b
       SET validacion = veredicto,
           nota_revision = coalesce(nota, b.nota_revision)
     WHERE b.visita_id = r.id;

    UPDATE public.visitas v
       SET observaciones = obs,
           observaciones_repartidas = true
     WHERE v.id = r.id;

    n_proc := n_proc + 1;
    IF veredicto = 'CORRECTO' THEN n_correcto := n_correcto + 1;
    ELSIF veredicto = 'NO CORRECTO' THEN n_no_correcto := n_no_correcto + 1;
    ELSE n_pendiente := n_pendiente + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'procesadas', n_proc,
    'correcto', n_correcto,
    'no_correcto', n_no_correcto,
    'pendiente', n_pendiente,
    'primeras_lineas_sin_clasificar', to_jsonb(dudosas)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.repartir_observaciones_gespromo(boolean) FROM PUBLIC, anon, authenticated;

-- Reencolado de visitas antiguas para el extractor de la fase 4: creada, NO ejecutada.
CREATE OR REPLACE FUNCTION public.reprocesar_historico_a_bloques(_limite integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE n int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;
  WITH cand AS (
    SELECT b.id FROM public.visita_bloques b
    JOIN public.visitas v ON v.id = b.visita_id
    WHERE v.observaciones_repartidas AND b.campos = '{}'::jsonb AND v.observaciones IS NOT NULL
    ORDER BY v.fecha DESC
    LIMIT _limite
  )
  UPDATE public.visita_bloques b
     SET campos_meta = jsonb_set(coalesce(b.campos_meta, '{}'::jsonb), '{_reprocesar}', 'true'::jsonb)
    FROM cand WHERE b.id = cand.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$fn$;

REVOKE ALL ON FUNCTION public.reprocesar_historico_a_bloques(integer) FROM PUBLIC, anon, authenticated;

-- Ejecución masiva con el trigger agregado desactivado (solo el agregado)
ALTER TABLE public.visita_bloques DISABLE TRIGGER trg_visita_bloques_agregado;

SELECT public.repartir_observaciones_gespromo(true);

UPDATE public.visitas v SET validacion = a.estado
FROM (
  SELECT b.visita_id,
         CASE
           WHEN bool_or(COALESCE(b.validacion,'pendiente') = 'NO CORRECTO') THEN 'NO CORRECTO'
           WHEN bool_or(COALESCE(b.validacion,'pendiente') = 'pendiente')    THEN 'pendiente'
           ELSE 'CORRECTO'
         END AS estado
  FROM public.visita_bloques b GROUP BY b.visita_id
) a
WHERE a.visita_id = v.id AND v.validacion IS DISTINCT FROM a.estado;

ALTER TABLE public.visita_bloques ENABLE TRIGGER trg_visita_bloques_agregado;