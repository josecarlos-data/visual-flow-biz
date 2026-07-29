import { useMemo, useState } from "react";
import { Plus, Trash2, Save, Loader2, GripVertical, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { useMotivos, useMotivosAdmin, type Motivo, type MotivoCampo } from "@/hooks/useCrm";

const TIPOS: { value: string; label: string }[] = [
  { value: "texto", label: "Texto corto" },
  { value: "texto_largo", label: "Texto largo" },
  { value: "numero", label: "Número" },
  { value: "select", label: "Lista de opciones" },
  { value: "booleano", label: "Sí / No" },
  { value: "fecha", label: "Fecha" },
];

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

function CampoRow({ campo, motivoKey }: { campo: MotivoCampo | null; motivoKey: string }) {
  const { guardarCampo, borrarCampo } = useMotivosAdmin();
  const [draft, setDraft] = useState<Partial<MotivoCampo>>(
    campo ?? { tipo: "texto", is_required: false, sort_order: 100, opciones: [], label: "" },
  );
  const nuevo = !campo;

  const guardar = async () => {
    if (!draft.label?.trim()) {
      toast({ title: "Falta el nombre del campo", variant: "destructive" });
      return;
    }
    try {
      await guardarCampo.mutateAsync({
        ...(campo ?? {}),
        ...draft,
        motivo_key: motivoKey,
        campo_key: draft.campo_key?.trim() || slug(draft.label),
        label: draft.label.trim(),
        opciones: draft.opciones ?? [],
      } as MotivoCampo);
      toast({ title: nuevo ? "Campo añadido" : "Campo actualizado" });
      if (nuevo) setDraft({ tipo: "texto", is_required: false, sort_order: 100, opciones: [], label: "" });
    } catch (e) {
      toast({ title: "No se ha podido guardar", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Nombre del campo</Label>
          <Input
            value={draft.label ?? ""}
            placeholder="Ej. Respuesta del cliente"
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={draft.tipo ?? "texto"} onValueChange={(v) => setDraft((d) => ({ ...d, tipo: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Ayuda para el comercial y la IA</Label>
          <Input
            value={draft.ayuda ?? ""}
            placeholder="Qué debe contar en este campo"
            onChange={(e) => setDraft((d) => ({ ...d, ayuda: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Orden</Label>
          <Input
            type="number"
            value={draft.sort_order ?? 100}
            onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
          />
        </div>
      </div>

      {draft.tipo === "select" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Opciones (separadas por comas)</Label>
          <Input
            value={(draft.opciones ?? []).join(", ")}
            placeholder="Interesado, Lo piensa, Pedido cerrado"
            onChange={(e) =>
              setDraft((d) => ({ ...d, opciones: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))
            }
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={Boolean(draft.is_required)}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, is_required: v }))}
          />
          Obligatorio
        </label>
        <div className="flex gap-2">
          {campo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => borrarCampo.mutate(campo.id)}
              disabled={borrarCampo.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />Eliminar
            </Button>
          )}
          <Button size="sm" onClick={guardar} disabled={guardarCampo.isPending}>
            {guardarCampo.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : nuevo ? <Plus className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {nuevo ? "Añadir campo" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MotivoEditor({ motivo }: { motivo: Motivo }) {
  const { guardarMotivo, borrarMotivo } = useMotivosAdmin();
  const [nombre, setNombre] = useState(motivo.nombre);
  const [descripcion, setDescripcion] = useState(motivo.descripcion ?? "");
  const [activo, setActivo] = useState(motivo.is_active);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Nombre de la plantilla</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Descripción</Label>
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={activo} onCheckedChange={setActivo} />
          Disponible para los comerciales
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => borrarMotivo.mutate(motivo.key)}>
            <Trash2 className="mr-2 h-4 w-4" />Eliminar plantilla
          </Button>
          <Button
            size="sm"
            onClick={() =>
              guardarMotivo.mutate(
                { ...motivo, nombre, descripcion: descripcion || null, is_active: activo },
                { onSuccess: () => toast({ title: "Plantilla actualizada" }) },
              )
            }
          >
            <Save className="mr-2 h-4 w-4" />Guardar plantilla
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Campos que debe cumplimentar el comercial</p>
        {motivo.campos.map((c) => <CampoRow key={c.id} campo={c} motivoKey={motivo.key} />)}
        <CampoRow campo={null} motivoKey={motivo.key} />
      </div>
    </div>
  );
}

export default function AdminVisitas() {
  const { data: motivos, isLoading } = useMotivos();
  const { guardarMotivo } = useMotivosAdmin();
  const [nuevo, setNuevo] = useState("");

  const orden = useMemo(() => [...(motivos ?? [])].sort((a, b) => a.sort_order - b.sort_order), [motivos]);

  const crear = () => {
    const nombre = nuevo.trim();
    if (!nombre) return;
    guardarMotivo.mutate(
      {
        key: slug(nombre),
        nombre,
        descripcion: null,
        color: "#64748b",
        sort_order: (orden.at(-1)?.sort_order ?? 0) + 10,
        is_active: true,
      },
      {
        onSuccess: () => {
          setNuevo("");
          toast({ title: "Plantilla creada" });
        },
        onError: (e) => toast({ title: "No se ha podido crear", description: (e as Error).message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Plantillas de visita</h1>
        <p className="text-sm text-muted-foreground">
          Define qué información debe recoger el comercial en cada tipo de visita
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Nueva plantilla</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Ej. Cobro pendiente" />
          <Button onClick={crear} disabled={guardarMotivo.isPending || !nuevo.trim()}>
            <Plus className="mr-2 h-4 w-4" />Crear
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : orden.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Todavía no hay plantillas de visita.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {orden.map((m) => (
            <AccordionItem key={m.key} value={m.key} className="rounded-lg border px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{m.nombre}</span>
                  <Badge variant="secondary">{m.campos.length} campos</Badge>
                  {!m.is_active && <Badge variant="outline">Inactiva</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <MotivoEditor motivo={m} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
