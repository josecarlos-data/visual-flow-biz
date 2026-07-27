
-- ============ PRODUCTOS ============
CREATE TABLE public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia text NOT NULL UNIQUE,
  descripcion text,
  familia text,
  marca text,
  precio numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productos TO authenticated;
GRANT ALL ON public.productos TO service_role;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users view productos" ON public.productos FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins manage productos" ON public.productos FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CLIENTE_PRODUCTOS ============
CREATE TABLE public.cliente_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_cliente integer NOT NULL,
  referencia text NOT NULL,
  descripcion text,
  familia text,
  importe numeric NOT NULL DEFAULT 0,
  unidades numeric NOT NULL DEFAULT 0,
  ultima_compra date,
  anio integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cod_cliente, referencia, anio)
);
CREATE INDEX idx_cliente_productos_cod ON public.cliente_productos (cod_cliente);
CREATE INDEX idx_cliente_productos_ref ON public.cliente_productos (referencia);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_productos TO authenticated;
GRANT ALL ON public.cliente_productos TO service_role;
ALTER TABLE public.cliente_productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role-scoped view cliente_productos" ON public.cliente_productos FOR SELECT TO authenticated
USING (
  public.is_approved(auth.uid()) AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'director_comercial')
    OR (public.has_role(auth.uid(), 'jefe_de_zona') AND cod_cliente IN (SELECT c.cod_cliente FROM public.clientes c WHERE c.delegacion = public.get_user_delegacion(auth.uid())))
    OR (public.has_role(auth.uid(), 'comercial') AND cod_cliente IN (SELECT c.cod_cliente FROM public.clientes c WHERE c.vendedor = public.get_user_employee_code(auth.uid())))
  )
);
CREATE POLICY "Admins manage cliente_productos" ON public.cliente_productos FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER cliente_productos_updated_at BEFORE UPDATE ON public.cliente_productos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RUTAS ============
CREATE TABLE public.rutas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  vendedor text,
  delegacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rutas TO authenticated;
GRANT ALL ON public.rutas TO service_role;
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users view rutas" ON public.rutas FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins manage rutas" ON public.rutas FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER rutas_updated_at BEFORE UPDATE ON public.rutas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ruta text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS provincia text;

-- ============ MOTIVOS DE VISITA ============
CREATE TABLE public.motivos_visita (
  key text PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motivos_visita TO authenticated;
GRANT ALL ON public.motivos_visita TO service_role;
ALTER TABLE public.motivos_visita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users view motivos" ON public.motivos_visita FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins manage motivos" ON public.motivos_visita FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER motivos_visita_updated_at BEFORE UPDATE ON public.motivos_visita FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.motivo_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motivo_key text NOT NULL REFERENCES public.motivos_visita(key) ON DELETE CASCADE,
  campo_key text NOT NULL,
  label text NOT NULL,
  ayuda text,
  tipo text NOT NULL DEFAULT 'texto',
  is_required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (motivo_key, campo_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motivo_campos TO authenticated;
GRANT ALL ON public.motivo_campos TO service_role;
ALTER TABLE public.motivo_campos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users view motivo_campos" ON public.motivo_campos FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins manage motivo_campos" ON public.motivo_campos FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER motivo_campos_updated_at BEFORE UPDATE ON public.motivo_campos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VISITAS ============
CREATE TABLE public.visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_cliente integer NOT NULL,
  motivo_key text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  vendedor text,
  user_id uuid,
  transcripcion text,
  observaciones text,
  campos jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado text NOT NULL DEFAULT 'guardada',
  origen text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_visitas_cod ON public.visitas (cod_cliente);
CREATE INDEX idx_visitas_fecha ON public.visitas (fecha DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitas TO authenticated;
GRANT ALL ON public.visitas TO service_role;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role-scoped view visitas" ON public.visitas FOR SELECT TO authenticated
USING (
  public.is_approved(auth.uid()) AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'director_comercial')
    OR (public.has_role(auth.uid(), 'jefe_de_zona') AND cod_cliente IN (SELECT c.cod_cliente FROM public.clientes c WHERE c.delegacion = public.get_user_delegacion(auth.uid())))
    OR user_id = auth.uid()
    OR (public.has_role(auth.uid(), 'comercial') AND cod_cliente IN (SELECT c.cod_cliente FROM public.clientes c WHERE c.vendedor = public.get_user_employee_code(auth.uid())))
  )
);
CREATE POLICY "Users insert own visitas" ON public.visitas FOR INSERT TO authenticated
WITH CHECK (public.is_approved(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users update own visitas" ON public.visitas FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users delete own visitas" ON public.visitas FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER visitas_updated_at BEFORE UPDATE ON public.visitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AGENDA ============
CREATE TABLE public.visitas_planificadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cod_cliente integer NOT NULL,
  fecha date NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente',
  notas text,
  visita_id uuid REFERENCES public.visitas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cod_cliente, fecha)
);
CREATE INDEX idx_planificadas_user_fecha ON public.visitas_planificadas (user_id, fecha);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitas_planificadas TO authenticated;
GRANT ALL ON public.visitas_planificadas TO service_role;
ALTER TABLE public.visitas_planificadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or team planificadas" ON public.visitas_planificadas FOR SELECT TO authenticated
USING (
  public.is_approved(auth.uid()) AND (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'director_comercial')
    OR (public.has_role(auth.uid(), 'jefe_de_zona') AND cod_cliente IN (SELECT c.cod_cliente FROM public.clientes c WHERE c.delegacion = public.get_user_delegacion(auth.uid())))
  )
);
CREATE POLICY "Manage own planificadas" ON public.visitas_planificadas FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Update own planificadas" ON public.visitas_planificadas FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Delete own planificadas" ON public.visitas_planificadas FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER planificadas_updated_at BEFORE UPDATE ON public.visitas_planificadas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INSIGHTS IA ============
CREATE TABLE public.cliente_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_cliente integer NOT NULL UNIQUE,
  resumen text,
  alertas jsonb NOT NULL DEFAULT '[]'::jsonb,
  oportunidades jsonb NOT NULL DEFAULT '[]'::jsonb,
  argumentario jsonb NOT NULL DEFAULT '[]'::jsonb,
  generado_en timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_insights TO authenticated;
GRANT ALL ON public.cliente_insights TO service_role;
ALTER TABLE public.cliente_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role-scoped view insights" ON public.cliente_insights FOR SELECT TO authenticated
USING (
  public.is_approved(auth.uid()) AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'director_comercial')
    OR (public.has_role(auth.uid(), 'jefe_de_zona') AND cod_cliente IN (SELECT c.cod_cliente FROM public.clientes c WHERE c.delegacion = public.get_user_delegacion(auth.uid())))
    OR (public.has_role(auth.uid(), 'comercial') AND cod_cliente IN (SELECT c.cod_cliente FROM public.clientes c WHERE c.vendedor = public.get_user_employee_code(auth.uid())))
  )
);
CREATE POLICY "Admins manage insights" ON public.cliente_insights FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER cliente_insights_updated_at BEFORE UPDATE ON public.cliente_insights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SINCRONIZACIÓN ONEDRIVE ============
CREATE TABLE public.sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_key text NOT NULL UNIQUE,
  file_url text,
  sheet_name text,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_config TO authenticated;
GRANT ALL ON public.sync_config TO service_role;
ALTER TABLE public.sync_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sync_config" ON public.sync_config FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER sync_config_updated_at BEFORE UPDATE ON public.sync_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_key text NOT NULL,
  status text NOT NULL,
  rows_processed integer NOT NULL DEFAULT 0,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_log_created ON public.sync_log (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_log TO authenticated;
GRANT ALL ON public.sync_log TO service_role;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sync_log" ON public.sync_log FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ DASHBOARDS NUEVOS ============
INSERT INTO public.dashboards (key, name, description, icon, route, sort_order, is_active) VALUES
  ('clientes', 'Clientes', 'Ficha 360 de clientes', 'Users', '/clientes', 10, true),
  ('agenda', 'Agenda', 'Planificación de visitas', 'CalendarDays', '/agenda', 20, true),
  ('visitas', 'Visitas', 'Registro de visitas comerciales', 'ClipboardList', '/visitas', 30, true)
ON CONFLICT (key) DO NOTHING;

-- ============ MOTIVOS SEMILLA ============
INSERT INTO public.motivos_visita (key, nombre, descripcion, color, sort_order) VALUES
  ('seguimiento', 'Seguimiento', 'Visita de seguimiento habitual del cliente', 'primary', 10),
  ('oferta', 'Oferta', 'Presentación o negociación de una oferta', 'accent', 20),
  ('competencia', 'Análisis de competencia', 'Recogida de información sobre la competencia', 'destructive', 30),
  ('incidencia', 'Incidencia', 'Resolución de una incidencia o reclamación', 'muted', 40)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.motivo_campos (motivo_key, campo_key, label, ayuda, tipo, is_required, sort_order) VALUES
  ('seguimiento','situacion','Situación actual del cliente','Cómo está funcionando el cliente, volumen y actividad','texto_largo',true,10),
  ('seguimiento','necesidades','Necesidades detectadas','Qué necesita el cliente a corto plazo','texto_largo',true,20),
  ('seguimiento','acuerdos','Acuerdos alcanzados','Compromisos concretos de esta visita','texto_largo',true,30),
  ('seguimiento','proxima_accion','Próxima acción','Qué hay que hacer y cuándo','texto',true,40),

  ('oferta','productos','Productos ofertados','Referencias o familias presentadas','texto_largo',true,10),
  ('oferta','condiciones','Condiciones ofrecidas','Precio, descuentos, plazos','texto_largo',true,20),
  ('oferta','respuesta_cliente','Respuesta del cliente','Reacción, objeciones y grado de interés','texto_largo',true,30),
  ('oferta','importe_estimado','Importe estimado','Valor aproximado de la operación en euros','numero',false,40),
  ('oferta','proxima_accion','Próxima acción','Seguimiento previsto','texto',true,50),

  ('competencia','competidor','Competidor','Nombre del competidor detectado','texto',true,10),
  ('competencia','productos_competencia','Productos y precios de la competencia','Qué ofrece y a qué precio','texto_largo',true,20),
  ('competencia','ventajas_debilidades','Ventajas y debilidades frente a nosotros','Dónde nos ganan y dónde ganamos','texto_largo',true,30),
  ('competencia','accion_propuesta','Acción propuesta','Cómo responder','texto_largo',true,40),

  ('incidencia','descripcion','Descripción de la incidencia','Qué ha ocurrido','texto_largo',true,10),
  ('incidencia','impacto','Impacto en el cliente','Cómo le afecta','texto_largo',true,20),
  ('incidencia','solucion','Solución acordada','Qué se ha acordado y plazo','texto_largo',true,30)
ON CONFLICT (motivo_key, campo_key) DO NOTHING;
