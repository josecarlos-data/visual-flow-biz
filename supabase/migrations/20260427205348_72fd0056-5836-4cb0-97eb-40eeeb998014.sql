-- Catálogo de dashboards
CREATE TABLE public.dashboards (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  route TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view dashboards"
  ON public.dashboards FOR SELECT TO authenticated
  USING (is_approved(auth.uid()));

CREATE POLICY "Admins manage dashboards"
  ON public.dashboards FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Asignaciones usuario ↔ dashboard
CREATE TABLE public.user_dashboard_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  dashboard_key TEXT NOT NULL REFERENCES public.dashboards(key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dashboard_key)
);

CREATE INDEX idx_user_dashboard_access_user ON public.user_dashboard_access(user_id);

ALTER TABLE public.user_dashboard_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dashboard access"
  ON public.user_dashboard_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all dashboard access"
  ON public.user_dashboard_access FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins manage dashboard access"
  ON public.user_dashboard_access FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Función helper
CREATE OR REPLACE FUNCTION public.has_dashboard_access(_user_id UUID, _dashboard_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_dashboard_access
      WHERE user_id = _user_id AND dashboard_key = _dashboard_key
    );
$$;

-- Seed inicial
INSERT INTO public.dashboards (key, name, description, icon, route, sort_order) VALUES
  ('ventas',  'Ventas',  'Resumen y análisis de ventas',  'BarChart3',   '/',        10),
  ('compras', 'Compras', 'Resumen y análisis de compras', 'ShoppingCart','/compras', 20);