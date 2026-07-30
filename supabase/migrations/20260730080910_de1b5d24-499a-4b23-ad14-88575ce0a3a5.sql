ALTER TABLE public.visitas
  ADD COLUMN IF NOT EXISTS nota_revision text,
  ADD COLUMN IF NOT EXISTS revisado_por uuid,
  ADD COLUMN IF NOT EXISTS revisado_en timestamptz;

UPDATE public.visitas SET validacion = CASE
  WHEN validacion IS NULL THEN 'pendiente'
  WHEN lower(validacion) LIKE '%no correct%' THEN 'no_correcta'
  WHEN lower(validacion) LIKE '%correct%' THEN 'correcta'
  WHEN lower(validacion) LIKE '%pdte%' OR lower(validacion) LIKE '%pendiente%' THEN 'incompleta'
  ELSE 'pendiente' END
WHERE validacion IS NULL OR validacion NOT IN ('pendiente','correcta','incompleta','no_correcta');

ALTER TABLE public.visitas ALTER COLUMN validacion SET DEFAULT 'pendiente';
ALTER TABLE public.visitas DROP CONSTRAINT IF EXISTS visitas_validacion_check;
ALTER TABLE public.visitas ADD CONSTRAINT visitas_validacion_check
  CHECK (validacion IS NULL OR validacion IN ('pendiente','correcta','incompleta','no_correcta'));

CREATE INDEX IF NOT EXISTS visitas_validacion_idx ON public.visitas (validacion, fecha DESC);

ALTER TABLE public.motivo_campos
  ADD COLUMN IF NOT EXISTS requerido_validacion boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.puede_revisar_visitas(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_approved(_user_id) AND (
    public.is_admin(_user_id)
    OR public.has_role(_user_id, 'director_comercial')
    OR public.has_role(_user_id, 'jefe_de_zona')
  )
$$;
REVOKE ALL ON FUNCTION public.puede_revisar_visitas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_revisar_visitas(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users update own visitas" ON public.visitas;
CREATE POLICY "Users update own visitas"
ON public.visitas FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'director_comercial')
  OR (public.has_role(auth.uid(), 'jefe_de_zona') AND (
        cod_cliente IS NULL OR cod_cliente IN (
          SELECT c.cod_cliente FROM public.clientes c
          WHERE c.delegacion = public.get_user_delegacion(auth.uid()))))
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'director_comercial')
  OR (public.has_role(auth.uid(), 'jefe_de_zona') AND (
        cod_cliente IS NULL OR cod_cliente IN (
          SELECT c.cod_cliente FROM public.clientes c
          WHERE c.delegacion = public.get_user_delegacion(auth.uid()))))
);