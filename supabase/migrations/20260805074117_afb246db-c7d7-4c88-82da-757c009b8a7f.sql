-- 1. motivo_campos: is_active + visibilidad
ALTER TABLE public.motivo_campos
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visibilidad text NOT NULL DEFAULT 'normal';

ALTER TABLE public.motivo_campos DROP CONSTRAINT IF EXISTS motivo_campos_visibilidad_check;
ALTER TABLE public.motivo_campos
  ADD CONSTRAINT motivo_campos_visibilidad_check CHECK (visibilidad IN ('normal','sistema'));

ALTER TABLE public.motivo_campos DROP CONSTRAINT IF EXISTS motivo_campos_tipo_check;
ALTER TABLE public.motivo_campos
  ADD CONSTRAINT motivo_campos_tipo_check CHECK (tipo IN (
    'texto','texto_largo','numero','select','booleano','fecha',
    'multiselect','referencia','adjunto','referencia_campana'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS motivo_campos_motivo_campo_uidx
  ON public.motivo_campos (motivo_key, campo_key);

-- 2. catalogos_opciones
CREATE TABLE IF NOT EXISTS public.catalogos_opciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text NOT NULL,
  valor text NOT NULL,
  orden integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS catalogos_opciones_clave_valor_uidx
  ON public.catalogos_opciones (clave, valor);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogos_opciones TO authenticated;
GRANT ALL ON public.catalogos_opciones TO service_role;

ALTER TABLE public.catalogos_opciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved users view catalogos" ON public.catalogos_opciones;
CREATE POLICY "Approved users view catalogos"
  ON public.catalogos_opciones FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Admins manage catalogos" ON public.catalogos_opciones;
CREATE POLICY "Admins manage catalogos"
  ON public.catalogos_opciones FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_catalogos_opciones_updated_at ON public.catalogos_opciones;
CREATE TRIGGER update_catalogos_opciones_updated_at
  BEFORE UPDATE ON public.catalogos_opciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Buscador de referencias
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS productos_referencia_trgm_idx
  ON public.productos USING gin (referencia extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS productos_descripcion_trgm_idx
  ON public.productos USING gin (descripcion extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.buscar_productos(_q text, _limite integer DEFAULT 15)
RETURNS TABLE(referencia text, descripcion text, familia text, marca text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT p.referencia, p.descripcion, COALESCE(p.familia_nombre, p.familia), COALESCE(p.marca_nombre, p.marca)
  FROM public.productos p
  WHERE public.is_approved(auth.uid())
    AND length(coalesce(_q,'')) >= 2
    AND (p.referencia ILIKE _q || '%' OR p.referencia ILIKE '%' || _q || '%' OR p.descripcion ILIKE '%' || _q || '%')
  ORDER BY (p.referencia ILIKE _q || '%') DESC, p.referencia
  LIMIT LEAST(COALESCE(_limite, 15), 50);
$$;

REVOKE EXECUTE ON FUNCTION public.buscar_productos(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_productos(text, integer) TO authenticated;

-- 4. Adjuntos de visita (bucket privado visitas-adjuntos, carpeta = user_id)
DROP POLICY IF EXISTS "Adjuntos visita: subir en carpeta propia" ON storage.objects;
CREATE POLICY "Adjuntos visita: subir en carpeta propia"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'visitas-adjuntos'
    AND public.is_approved(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Adjuntos visita: actualizar propios" ON storage.objects;
CREATE POLICY "Adjuntos visita: actualizar propios"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'visitas-adjuntos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'visitas-adjuntos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Adjuntos visita: borrar propios o admin" ON storage.objects;
CREATE POLICY "Adjuntos visita: borrar propios o admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'visitas-adjuntos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Adjuntos visita: ver propios o revisores" ON storage.objects;
CREATE POLICY "Adjuntos visita: ver propios o revisores"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'visitas-adjuntos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'director_comercial'::public.app_role)
      OR public.puede_revisar_visitas(auth.uid())
    )
  );