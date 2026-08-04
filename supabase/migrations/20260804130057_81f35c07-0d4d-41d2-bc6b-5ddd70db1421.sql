CREATE OR REPLACE FUNCTION public.repartir_observaciones_gespromo(_forzar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  r record;
  lineas text[];
  pal text[];
  l1 text;
  raw1 text;
  norm1 text;
  cand text;
  consumidas int;
  veredicto text;
  resto_marca text;
  nota text;
  obs text;
  i int;
  k int;
  n_proc int := 0;
  n_correcto int := 0;
  n_no_correcto int := 0;
  n_pendiente int := 0;
  dudosas text[] := ARRAY[]::text[];
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

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
    resto_marca := NULL;

    IF r.origen IS NOT NULL AND btrim(r.origen) <> '' THEN
      lineas := regexp_split_to_array(replace(r.origen, E'\r', ''), E'\n');
      raw1 := btrim(coalesce(lineas[1], ''));
      norm1 := btrim(regexp_replace(
                 regexp_replace(
                   upper(translate(raw1, 'áéíóúàèìòùÁÉÍÓÚÀÈÌÒÙñÑüÜçÇ', 'aeiouaeiouAEIOUAEIOUnNuUcC')),
                 '[^A-Z ]', ' ', 'g'), '\s+', ' ', 'g'));
      pal := string_to_array(norm1, ' ');
      consumidas := 0;

      IF raw1 = upper(raw1) AND coalesce(array_length(pal, 1), 0) > 0 THEN
        -- PRIMERO la negación: 'NO CORRECTO' contiene 'CORRECTO'
        IF pal[1] IN ('N', 'NO') THEN
          IF pal[2] = 'ES' THEN cand := pal[3]; consumidas := 3;
          ELSE cand := pal[2]; consumidas := 2; END IF;
          IF cand IS NOT NULL AND extensions.levenshtein(cand, 'CORRECTO') <= 3 THEN
            veredicto := 'NO CORRECTO';
          ELSE
            consumidas := 0;
          END IF;
        END IF;

        IF veredicto = 'pendiente' AND left(pal[1], 1) = 'N'
           AND extensions.levenshtein(pal[1], 'NOCORRECTO') <= 3 THEN
          veredicto := 'NO CORRECTO'; consumidas := 1;
        ELSIF veredicto = 'pendiente' AND left(pal[1], 1) = 'C'
           AND extensions.levenshtein(pal[1], 'CORRECTO') <= 2 THEN
          veredicto := 'CORRECTO'; consumidas := 1;
        END IF;

        IF veredicto = 'pendiente' AND length(norm1) BETWEEN 4 AND 30
           AND (array_length(dudosas, 1) IS NULL OR array_length(dudosas, 1) < 50) THEN
          dudosas := dudosas || raw1;
        END IF;
      END IF;

      IF consumidas > 0 THEN
        resto_marca := raw1;
        FOR k IN 1..consumidas LOOP
          resto_marca := btrim(regexp_replace(btrim(resto_marca), '^[^\s]+', ''));
        END LOOP;
        resto_marca := btrim(regexp_replace(resto_marca, '^[\s/\-–:,\.]+', ''));
        i := 2;
        IF resto_marca <> '' THEN nota := resto_marca; END IF;
        WHILE i <= coalesce(array_length(lineas, 1), 0) LOOP
          l1 := btrim(coalesce(lineas[i], ''));
          IF l1 = '' THEN
            EXIT WHEN nota IS NULL;
            i := i + 1;
            CONTINUE;
          END IF;
          EXIT WHEN l1 <> upper(l1) OR l1 !~ '[A-ZÁÉÍÓÚÑ]';
          nota := btrim(coalesce(nota || ' ', '') || l1);
          i := i + 1;
        END LOOP;
      ELSE
        i := 1;
      END IF;

      obs := btrim(array_to_string(lineas[i:coalesce(array_length(lineas, 1), 0)], E'\n'));
      IF obs = '' THEN obs := NULL; END IF;
    END IF;

    UPDATE public.visita_bloques b
       SET validacion = veredicto,
           nota_revision = nota
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