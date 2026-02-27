
-- Drop old table and recreate with proper structure for monthly data
DROP TABLE IF EXISTS public.historico_facturacion;

-- Client master data
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cod_cliente INTEGER NOT NULL UNIQUE,
  cliente TEXT NOT NULL,
  delegacion TEXT,
  localidad TEXT,
  vendedor TEXT,
  tipo_cliente TEXT,
  observaciones TEXT,
  transporte NUMERIC(12,2) DEFAULT 0,
  proyeccion_2026 NUMERIC(12,2),
  crecimiento_previsto NUMERIC(10,6),
  top_truck TEXT,
  gsmart_delegacion TEXT,
  gsmart_comercial TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Monthly sales data
CREATE TABLE public.ventas_mensuales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cod_cliente INTEGER NOT NULL REFERENCES public.clientes(cod_cliente) ON DELETE CASCADE,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cod_cliente, anio, mes)
);

-- Indexes
CREATE INDEX idx_ventas_mensuales_cliente ON public.ventas_mensuales(cod_cliente);
CREATE INDEX idx_ventas_mensuales_anio ON public.ventas_mensuales(anio);
CREATE INDEX idx_ventas_mensuales_anio_mes ON public.ventas_mensuales(anio, mes);
CREATE INDEX idx_clientes_vendedor ON public.clientes(vendedor);
CREATE INDEX idx_clientes_delegacion ON public.clientes(delegacion);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_mensuales ENABLE ROW LEVEL SECURITY;

-- RLS for clientes
CREATE POLICY "Approved users can view clientes" ON public.clientes FOR SELECT USING (is_approved(auth.uid()));
CREATE POLICY "Admins can insert clientes" ON public.clientes FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update clientes" ON public.clientes FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete clientes" ON public.clientes FOR DELETE USING (is_admin(auth.uid()));

-- RLS for ventas_mensuales
CREATE POLICY "Approved users can view ventas" ON public.ventas_mensuales FOR SELECT USING (is_approved(auth.uid()));
CREATE POLICY "Admins can insert ventas" ON public.ventas_mensuales FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update ventas" ON public.ventas_mensuales FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete ventas" ON public.ventas_mensuales FOR DELETE USING (is_admin(auth.uid()));

-- Trigger for updated_at on clientes
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
