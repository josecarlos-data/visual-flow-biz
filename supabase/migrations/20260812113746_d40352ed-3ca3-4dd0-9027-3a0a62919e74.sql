-- 1) Catálogo de atributos de perfil
CREATE TABLE public.perfil_atributos (
  key text PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  tipo text NOT NULL DEFAULT 'texto',
  opciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  unidad text,
  grupo text NOT NULL DEFAULT 'general',
  caduca_dias integer,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil_atributos TO authenticated;
GRANT ALL ON public.perfil_atributos TO service_role;

ALTER TABLE public.perfil_atributos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil_atributos_select_auth"
  ON public.perfil_atributos FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfil_atributos_insert_admin"
  ON public.perfil_atributos FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "perfil_atributos_update_admin"
  ON public.perfil_atributos FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "perfil_atributos_delete_admin"
  ON public.perfil_atributos FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 2) Hechos observados del perfil de cliente
CREATE TABLE public.cliente_perfil_datos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_cliente integer NOT NULL REFERENCES public.clientes(cod_cliente) ON DELETE CASCADE,
  atributo_key text NOT NULL REFERENCES public.perfil_atributos(key) ON DELETE RESTRICT,
  valor_texto text NOT NULL,
  valor_num numeric,
  visita_id uuid REFERENCES public.visitas(id) ON DELETE SET NULL,
  bloque_id uuid REFERENCES public.visita_bloques(id) ON DELETE CASCADE,
  comercial_nombre text,
  user_id uuid,
  observado_en date NOT NULL,
  confianza numeric,
  fuente text NOT NULL DEFAULT 'manual' CHECK (fuente IN ('voz','importacion','manual','erp')),
  estado text NOT NULL DEFAULT 'sin_confirmar' CHECK (estado IN ('sin_confirmar','confirmado','descartado')),
  confirmado_por uuid,
  confirmado_en timestamptz,
  descartado_por uuid,
  descartado_en timestamptz,
  motivo_descarte text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cliente_perfil_datos_bloque_atributo_key UNIQUE (bloque_id, atributo_key)
);

CREATE INDEX cliente_perfil_datos_vigente_idx
  ON public.cliente_perfil_datos (cod_cliente, atributo_key, observado_en DESC, created_at DESC)
  WHERE estado <> 'descartado';
CREATE INDEX cliente_perfil_datos_visita_idx
  ON public.cliente_perfil_datos (visita_id);
CREATE INDEX cliente_perfil_datos_atributo_idx
  ON public.cliente_perfil_datos (atributo_key)
  WHERE estado <> 'descartado';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_perfil_datos TO authenticated;
GRANT ALL ON public.cliente_perfil_datos TO service_role;

ALTER TABLE public.cliente_perfil_datos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_perfil_datos_select"
  ON public.cliente_perfil_datos FOR SELECT TO authenticated
  USING (public.can_view_cliente(auth.uid(), cod_cliente));
CREATE POLICY "cliente_perfil_datos_insert"
  ON public.cliente_perfil_datos FOR INSERT TO authenticated
  WITH CHECK (public.can_view_cliente(auth.uid(), cod_cliente));
CREATE POLICY "cliente_perfil_datos_update"
  ON public.cliente_perfil_datos FOR UPDATE TO authenticated
  USING (public.can_view_cliente(auth.uid(), cod_cliente))
  WITH CHECK (public.can_view_cliente(auth.uid(), cod_cliente));
CREATE POLICY "cliente_perfil_datos_delete_admin"
  ON public.cliente_perfil_datos FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3) Enlace desde los campos de plantilla al atributo de perfil
ALTER TABLE public.motivo_campos
  ADD COLUMN IF NOT EXISTS perfil_atributo_key text
  REFERENCES public.perfil_atributos(key) ON DELETE SET NULL;

-- 4) Vista de valor vigente
CREATE VIEW public.v_cliente_perfil_vigente
WITH (security_invoker = true) AS
SELECT DISTINCT ON (cod_cliente, atributo_key) *
FROM public.cliente_perfil_datos
WHERE estado <> 'descartado'
ORDER BY cod_cliente, atributo_key, observado_en DESC, created_at DESC;

GRANT SELECT ON public.v_cliente_perfil_vigente TO authenticated;
GRANT SELECT ON public.v_cliente_perfil_vigente TO service_role;

-- 5) Triggers de updated_at
CREATE TRIGGER update_perfil_atributos_updated_at
  BEFORE UPDATE ON public.perfil_atributos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cliente_perfil_datos_updated_at
  BEFORE UPDATE ON public.cliente_perfil_datos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Seed del catálogo desde los campos del motivo informacion_potencial
INSERT INTO public.perfil_atributos (key, nombre, descripcion, tipo, opciones, sort_order)
SELECT campo_key, label, ayuda, tipo, opciones, sort_order
FROM public.motivo_campos
WHERE motivo_key = 'informacion_potencial'
  AND campo_key NOT IN ('persona_contacto','observaciones')
ON CONFLICT (key) DO NOTHING;

UPDATE public.motivo_campos
SET perfil_atributo_key = campo_key
WHERE motivo_key = 'informacion_potencial'
  AND campo_key NOT IN ('persona_contacto','observaciones');
