
-- Table: historico_facturacion
CREATE TABLE public.historico_facturacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_cliente INTEGER NOT NULL,
  cliente TEXT NOT NULL,
  vendedor TEXT NOT NULL,
  ventas_2024 NUMERIC(12,2) DEFAULT 0,
  ventas_2025 NUMERIC(12,2) DEFAULT 0,
  peso_25 NUMERIC(10,6) DEFAULT 0,
  enero_2026 NUMERIC(12,2) DEFAULT 0,
  febrero_2026 NUMERIC(12,2) DEFAULT 0,
  ventas_2026 NUMERIC(12,2) DEFAULT 0,
  peso_26 NUMERIC(14,10) DEFAULT 0,
  proyeccion_2026 NUMERIC(12,2) DEFAULT 0,
  crecimiento_previsto NUMERIC(14,10) DEFAULT 0,
  margen_pct NUMERIC(6,2) DEFAULT 0,
  top_truck TEXT,
  delegacion TEXT,
  comercial_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cod_cliente)
);

-- Enable RLS
ALTER TABLE public.historico_facturacion ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated and approved users
CREATE POLICY "Approved users can view historico"
ON public.historico_facturacion
FOR SELECT
TO authenticated
USING (public.is_approved(auth.uid()));

-- INSERT/UPDATE/DELETE: admin only
CREATE POLICY "Admins can insert historico"
ON public.historico_facturacion
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update historico"
ON public.historico_facturacion
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete historico"
ON public.historico_facturacion
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_historico_updated_at
BEFORE UPDATE ON public.historico_facturacion
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table: detalle_ventas (prepared for future use)
CREATE TABLE public.detalle_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia TEXT NOT NULL,
  cod_cliente INTEGER NOT NULL,
  fecha DATE NOT NULL,
  documento TEXT NOT NULL,
  importe NUMERIC(12,2) DEFAULT 0,
  vendedor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated and approved users
CREATE POLICY "Approved users can view detalle_ventas"
ON public.detalle_ventas
FOR SELECT
TO authenticated
USING (public.is_approved(auth.uid()));

-- INSERT/UPDATE/DELETE: admin only
CREATE POLICY "Admins can insert detalle_ventas"
ON public.detalle_ventas
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update detalle_ventas"
ON public.detalle_ventas
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete detalle_ventas"
ON public.detalle_ventas
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
