CREATE OR REPLACE FUNCTION public.repartir_observaciones_gespromo(_forzar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  r record;
  lineas text[];
  toks text[];
  raw1 text;
  tk text;
  ntk text;
  cand text;
  consumidas int;
  veredicto text;
  nota text;
  obs text;
  resto1 text;
  l1 text;
  letras text;
  mays text;
  i int;
  j int;
  nl int;
  n_proc int := 0;
  n_correcto int := 0;
  n_no_correcto int := 0;
  n_pendiente int := 0;
  n_nota int := 0;
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
    resto1 := NULL;
    consumidas := 0;
    i := 1;

    IF r.origen IS NOT NULL AND btrim(r.origen) <> '' THEN
      lineas := regexp_split_to_array(replace(r.origen, E'\r', ''), E'\n');
      nl := coalesce(array_length(lineas, 1), 0);
      raw1 := btrim(coalesce(lineas[1], ''));
      toks := (SELECT array_agg(t) FROM unnest(regexp_split_to_array(raw1, '\s+')) AS t WHERE t <> '');

      IF coalesce(array_length(toks, 1), 0) > 0 THEN
        -- normalizador de token: sin acentos, solo letras, mayúsculas
        ntk := upper(regexp_replace(translate(toks[1],
                 'áéíóúàèìòùÁÉÍÓÚÀÈÌÒÙñÑüÜçÇ', 'aeiouaeiouAEIOUAEIOUnNuUcC'),
                 '[^A-Za-z]', '', 'g'));

        IF ntk IN ('NO', 'N') AND array_length(toks, 1) >= 2 THEN
          cand := upper(regexp_replace(translate(toks[2],
                    'áéíóúàèìòùÁÉÍÓÚÀÈÌÒÙñÑüÜçÇ', 'aeiouaeiouAEIOUAEIOUnNuUcC'),
                    '[^A-Za-z]', '', 'g'));
          IF cand = 'ES' AND array_length(toks, 1) >= 3 THEN
            cand := upper(regexp_replace(translate(toks[3],
                      'áéíóúàèìòùÁÉÍÓÚÀÈÌÒÙñÑüÜçÇ', 'aeiouaeiouAEIOUAEIOUnNuUcC'),
                      '[^A-Za-z]', '', 'g'));
            IF extensions.levenshtein(cand, 'CORRECTO') <= 3 THEN
              veredicto := 'NO CORRECTO'; consumidas := 3;
            END IF;
          ELSIF extensions.levenshtein(cand, 'CORRECTO') <= 3 THEN
            veredicto := 'NO CORRECTO'; consumidas := 2;
          END IF;
        END IF;

        IF consumidas = 0 AND left(ntk, 1) = 'N'
           AND extensions.levenshtein(ntk, 'NOCORRECTO') <= 3 THEN
          veredicto := 'NO CORRECTO'; consumidas := 1;
        ELSIF consumidas = 0 AND left(ntk, 1) = 'C'
           AND extensions.levenshtein(ntk, 'CORRECTO') <= 2 THEN
          veredicto := 'CORRECTO'; consumidas := 1;
        END IF;
      END IF;

      IF consumidas > 0 THEN
        -- 1) tramo en MAYÚSCULAS inmediatamente posterior al marcador (misma línea)
        j := consumidas + 1;
        WHILE j <= coalesce(array_length(toks, 1), 0) LOOP
          tk := toks[j];
          EXIT WHEN tk <> upper(tk);          -- contiene minúsculas -> es del comercial
          EXIT WHEN tk !~ '[[:alpha:]]' AND nota IS NULL;  -- no arrancar la nota con puntuación suelta
          nota := btrim(coalesce(nota || ' ', '') || tk);
          j := j + 1;
        END LOOP;
        resto1 := btrim(array_to_string(toks[j:coalesce(array_length(toks, 1), 0)], ' '));
        IF resto1 = '' THEN resto1 := NULL; END IF;

        -- 2) líneas posteriores íntegramente del director (>=8 letras, >=90% mayúsculas)
        i := 2;
        IF resto1 IS NULL THEN
          WHILE i <= nl LOOP
            l1 := btrim(coalesce(lineas[i], ''));
            IF l1 = '' THEN
              EXIT WHEN nota IS NULL;
              i := i + 1;
              CONTINUE;
            END IF;
            letras := regexp_replace(l1, '[^[:alpha:]]', '', 'g');
            mays   := regexp_replace(l1, '[^[:upper:]]', '', 'g');
            EXIT WHEN length(letras) < 8;
            EXIT WHEN length(mays) < 0.9 * length(letras);
            nota := btrim(coalesce(nota || ' ', '') || l1);
            i := i + 1;
          END LOOP;
        END IF;
      END IF;

      obs := btrim(concat_ws(E'\n',
               nullif(resto1, ''),
               nullif(btrim(array_to_string(lineas[greatest(i, 2):nl], E'\n')), '')));
      IF consumidas = 0 THEN
        obs := btrim(array_to_string(lineas[1:nl], E'\n'));
      END IF;
      IF obs = '' THEN obs := NULL; END IF;
      IF nota = '' THEN nota := NULL; END IF;
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
    IF nota IS NOT NULL THEN n_nota := n_nota + 1; END IF;
    IF veredicto = 'CORRECTO' THEN n_correcto := n_correcto + 1;
    ELSIF veredicto = 'NO CORRECTO' THEN n_no_correcto := n_no_correcto + 1;
    ELSE n_pendiente := n_pendiente + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'procesadas', n_proc,
    'correcto', n_correcto,
    'no_correcto', n_no_correcto,
    'pendiente', n_pendiente,
    'con_nota_revision', n_nota
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