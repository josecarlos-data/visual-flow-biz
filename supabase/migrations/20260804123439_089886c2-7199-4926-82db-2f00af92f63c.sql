-- ============ FASE 2: bloques de visita ============

-- 0. El CHECK antiguo de visitas.validacion solo admitía el vocabulario viejo
ALTER TABLE public.visitas DROP CONSTRAINT IF EXISTS visitas_validacion_check;

-- 1. Normalizar el vocabulario de validación ANTES de crear el trigger agregado
UPDATE public.visitas SET validacion = 'CORRECTO' WHERE validacion = 'correcta';
UPDATE public.visitas SET validacion = 'NO CORRECTO' WHERE validacion IN ('no_correcta','incompleta');
UPDATE public.visitas SET validacion = 'pendiente' WHERE validacion IS NULL;

ALTER TABLE public.visitas
  ADD CONSTRAINT visitas_validacion_check
  CHECK (validacion IS NULL OR validacion IN ('pendiente','CORRECTO','NO CORRECTO'));

-- 2. Tabla de bloques
CREATE TABLE IF NOT EXISTS public.visita_bloques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE CASCADE,
  motivo_key text REFERENCES public.motivos_visita(key),
  campos jsonb NOT NULL DEFAULT '{}'::jsonb,
  campos_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  completo boolean NOT NULL DEFAULT true,
  validacion text NOT NULL DEFAULT 'pendiente'
    CHECK (validacion IN ('pendiente','CORRECTO','NO CORRECTO')),
  nota_revision text,
  revisado_por uuid,
  revisado_en timestamptz,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visita_bloques TO authenticated;
GRANT ALL ON public.visita_bloques TO service_role;

ALTER TABLE public.visita_bloques ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_visita_bloques_visita_id ON public.visita_bloques(visita_id);

DROP TRIGGER IF EXISTS update_visita_bloques_updated_at ON public.visita_bloques;
CREATE TRIGGER update_visita_bloques_updated_at
  BEFORE UPDATE ON public.visita_bloques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Políticas (permisivas), espejo de las de visitas resolviendo la visita padre
DROP POLICY IF EXISTS "ver bloques de visitas visibles" ON public.visita_bloques;
CREATE POLICY "ver bloques de visitas visibles" ON public.visita_bloques
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.visitas v
  WHERE v.id = visita_bloques.visita_id AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(),'director_comercial')
    OR v.user_id = auth.uid()
    OR (public.has_role(auth.uid(),'jefe_de_zona')
        AND v.cod_cliente IN (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())))
  )
));

DROP POLICY IF EXISTS "crear bloques en visitas propias" ON public.visita_bloques;
CREATE POLICY "crear bloques en visitas propias" ON public.visita_bloques
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.visitas v
  WHERE v.id = visita_bloques.visita_id AND (
    v.user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.puede_revisar_visitas(auth.uid())
  )
));

DROP POLICY IF EXISTS "editar bloques propios o revisables" ON public.visita_bloques;
CREATE POLICY "editar bloques propios o revisables" ON public.visita_bloques
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.visitas v
  WHERE v.id = visita_bloques.visita_id AND (
    v.user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.puede_revisar_visitas(auth.uid())
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.visitas v
  WHERE v.id = visita_bloques.visita_id AND (
    v.user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.puede_revisar_visitas(auth.uid())
  )
));

DROP POLICY IF EXISTS "borrar bloques propios o admin" ON public.visita_bloques;
CREATE POLICY "borrar bloques propios o admin" ON public.visita_bloques
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.visitas v
  WHERE v.id = visita_bloques.visita_id AND (
    v.user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.puede_revisar_visitas(auth.uid())
  )
));

-- 4. Proteger los campos de revisión del bloque: solo quien puede revisar
CREATE OR REPLACE FUNCTION public.visita_bloques_guard_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) OR public.puede_revisar_visitas(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.validacion := OLD.validacion;
  NEW.nota_revision := OLD.nota_revision;
  NEW.revisado_por := OLD.revisado_por;
  NEW.revisado_en := OLD.revisado_en;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visita_bloques_guard_revision ON public.visita_bloques;
CREATE TRIGGER trg_visita_bloques_guard_revision
  BEFORE UPDATE ON public.visita_bloques
  FOR EACH ROW EXECUTE FUNCTION public.visita_bloques_guard_revision();

-- 5. Backfill del histórico: un bloque por visita (idempotente, antes del trigger agregado)
INSERT INTO public.visita_bloques (visita_id, motivo_key, campos, validacion, nota_revision, revisado_por, revisado_en, orden)
SELECT v.id, v.motivo_key, COALESCE(v.campos,'{}'::jsonb),
       CASE WHEN v.validacion IN ('CORRECTO','NO CORRECTO') THEN v.validacion ELSE 'pendiente' END,
       v.nota_revision, v.revisado_por, v.revisado_en, 0
FROM public.visitas v
WHERE NOT EXISTS (SELECT 1 FROM public.visita_bloques b WHERE b.visita_id = v.id);

-- 6. Trigger agregado: visitas.validacion se deriva de sus bloques
CREATE OR REPLACE FUNCTION public.recalcular_validacion_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _visita uuid := COALESCE(NEW.visita_id, OLD.visita_id);
  _estado text;
BEGIN
  SELECT CASE
           WHEN count(*) = 0 THEN NULL
           WHEN bool_or(COALESCE(b.validacion,'pendiente') = 'NO CORRECTO') THEN 'NO CORRECTO'
           WHEN bool_or(COALESCE(b.validacion,'pendiente') = 'pendiente') THEN 'pendiente'
           WHEN bool_and(COALESCE(b.validacion,'pendiente') = 'CORRECTO') THEN 'CORRECTO'
           ELSE 'pendiente'
         END
    INTO _estado
  FROM public.visita_bloques b
  WHERE b.visita_id = _visita;

  IF _estado IS NOT NULL THEN
    UPDATE public.visitas v
       SET validacion = _estado
     WHERE v.id = _visita AND v.validacion IS DISTINCT FROM _estado;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_visita_bloques_agregado ON public.visita_bloques;
CREATE TRIGGER trg_visita_bloques_agregado
  AFTER INSERT OR UPDATE OF validacion OR DELETE ON public.visita_bloques
  FOR EACH ROW EXECUTE FUNCTION public.recalcular_validacion_visita();