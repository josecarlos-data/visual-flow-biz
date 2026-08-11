import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Opcion {
  id: string;
  clave: string;
  valor: string;
  orden: number;
  is_active: boolean;
  nota: string | null;
}

function useOpciones() {
  return useQuery({
    queryKey: ["catalogos-opciones-admin"],
    queryFn: async (): Promise<Opcion[]> => {
      const { data, error } = await supabase
        .from("catalogos_opciones")
        .select("id, clave, valor, orden, is_active, nota")
        .order("clave")
        .order("orden");
      if (error) throw error;
      return (data ?? []) as unknown as Opcion[];
    },
  });
}

function OpcionRow({ opcion, clave }: { opcion: Opcion | null; clave: string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Opcion>>(
    opcion ?? { valor: "", orden: 999, is_active: true, nota: "" },
  );
  const nuevo = !opcion;

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        clave,
        valor: (draft.valor ?? "").trim(),
        orden: Number(draft.orden ?? 999),
        is_active: draft.is_active ?? true,
        nota: (draft.nota ?? "").trim() || null,
      };
      if (!payload.valor) throw new Error("El valor no puede estar vacío");
      const q = opcion
        ? supabase.from("catalogos_opciones").update(payload).eq("id", opcion.id)
        : supabase.from("catalogos_opciones").insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalogos-opciones-admin"] });
      void qc.invalidateQueries({ queryKey: ["catalogos"] });
      if (nuevo) setDraft({ valor: "", orden: 999, is_active: true, nota: "" });
      toast({ title: nuevo ? "Valor añadido" : "Valor guardado" });
    },
    onError: (e) =>
      toast({ title: "No se ha podido guardar", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,2fr)_80px_auto_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label className="text-xs">Valor</Label>
        <Input value={draft.valor ?? ""} onChange={(e) => setDraft((d) => ({ ...d, valor: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Orden</Label>
        <Input
          type="number"
          value={draft.orden ?? 0}
          onChange={(e) => setDraft((d) => ({ ...d, orden: Number(e.target.value) }))}
        />
      </div>
      <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
        <Switch
          checked={draft.is_active ?? true}
          onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))}
        />
        Activo
      </label>
      <Button size="sm" onClick={() => guardar.mutate()} disabled={guardar.isPending}>
        {guardar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : nuevo ? <Plus className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
        {nuevo ? "Añadir" : "Guardar"}
      </Button>
      <div className="space-y-1.5 sm:col-span-4">
        <Label className="text-xs">Nota</Label>
        <Textarea
          rows={2}
          placeholder="Por qué se añade o se desactiva este valor (ej. Desactivado 08/2026: no aparece en el histórico)"
          value={draft.nota ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, nota: e.target.value }))}
        />
      </div>
    </div>
  );
}

/** Editor de los catálogos cerrados que alimentan los campos de las plantillas. */
export function CatalogosAdmin() {
  const { data, isLoading } = useOpciones();
  const [verInactivos, setVerInactivos] = useState(false);

  const grupos = useMemo(() => {
    const map = new Map<string, Opcion[]>();
    for (const o of data ?? []) {
      if (!verInactivos && !o.is_active) continue;
      const arr = map.get(o.clave) ?? [];
      arr.push(o);
      map.set(o.clave, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data, verInactivos]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Catálogos de opciones</CardTitle>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={verInactivos} onCheckedChange={setVerInactivos} />
          <EyeOff className="h-4 w-4" /> Ver desactivados
        </label>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {grupos.map(([clave, opciones]) => (
              <AccordionItem key={clave} value={clave} className="rounded-lg border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <span className="font-medium">{clave}</span>
                    <Badge variant="secondary">{opciones.filter((o) => o.is_active).length} activos</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pb-4">
                  {opciones.map((o) => <OpcionRow key={o.id} opcion={o} clave={clave} />)}
                  <OpcionRow opcion={null} clave={clave} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
