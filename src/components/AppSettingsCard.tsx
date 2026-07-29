import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, SlidersHorizontal } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AppSettingsCard() {
  const [anios, setAnios] = useState("3");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings" as never)
        .select("value")
        .eq("key", "anios_cliente_activo")
        .maybeSingle();
      const v = (data as { value?: string } | null)?.value;
      if (v) setAnios(v);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const n = Number(anios);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      toast({ title: "Valor no válido", description: "Introduce un número entero entre 1 y 20.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("app_settings" as never)
      .upsert({ key: "anios_cliente_activo", value: String(n) } as never, { onConflict: "key" } as never);
    setSaving(false);
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Parámetro guardado", description: `Los clientes activos son los que han comprado en los últimos ${n} años.` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="h-4 w-4" /> Parámetros generales
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="anios-activo">Años para considerar activo a un cliente</Label>
          <Input
            id="anios-activo"
            type="number"
            min={1}
            max={20}
            value={anios}
            disabled={loading}
            onChange={(e) => setAnios(e.target.value)}
            className="sm:max-w-[160px]"
          />
          <p className="text-xs text-muted-foreground">
            Un cliente es activo si tiene alguna venta dentro de ese número de años.
          </p>
        </div>
        <Button onClick={save} disabled={saving || loading} className="gap-2">
          <Save className="h-4 w-4" /> Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
