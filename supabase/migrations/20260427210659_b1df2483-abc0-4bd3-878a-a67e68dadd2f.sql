CREATE TABLE public.compras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proveedor text NOT NULL,
  referencia text NOT NULL,
  importe numeric NOT NULL DEFAULT 0,
  fecha date NOT NULL,
  categoria text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_compras_fecha ON public.compras(fecha);
CREATE INDEX idx_compras_proveedor ON public.compras(proveedor);

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users with compras access can view"
ON public.compras
FOR SELECT
TO authenticated
USING (is_approved(auth.uid()) AND has_dashboard_access(auth.uid(), 'compras'));

CREATE POLICY "Admins can insert compras"
ON public.compras
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update compras"
ON public.compras
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete compras"
ON public.compras
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE TRIGGER update_compras_updated_at
BEFORE UPDATE ON public.compras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();