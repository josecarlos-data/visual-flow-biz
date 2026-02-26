import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Comercial {
  user_id: string;
  full_name: string | null;
  employee_code: string | null;
}

interface ComercialFilterProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function ComercialFilter({ selectedIds, onSelectionChange }: ComercialFilterProps) {
  const [comerciales, setComerciales] = useState<Comercial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get users with role 'comercial'
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "comercial");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, employee_code")
        .in("user_id", ids)
        .eq("is_approved", true);

      setComerciales(
        (profiles ?? []).map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          employee_code: (p as any).employee_code ?? null,
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const toggle = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Filtrar por comerciales
          {selectedIds.length > 0 && (
            <Badge variant="secondary">{selectedIds.length} seleccionados</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : comerciales.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay comerciales registrados aún.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {comerciales.map((c) => (
              <label
                key={c.user_id}
                className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent data-[checked=true]:bg-accent"
                data-checked={selectedIds.includes(c.user_id)}
              >
                <Checkbox
                  checked={selectedIds.includes(c.user_id)}
                  onCheckedChange={() => toggle(c.user_id)}
                />
                <span>{c.full_name || "Sin nombre"}</span>
                {c.employee_code && (
                  <Badge variant="outline" className="text-xs">{c.employee_code}</Badge>
                )}
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
