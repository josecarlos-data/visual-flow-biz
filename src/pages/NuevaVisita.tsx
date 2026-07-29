import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Wand2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useClientes, useMotivos, hoyISO } from "@/hooks/useCrm";

export default function NuevaVisita() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, employeeCode } = useAuth();
  const { data: clientes } = useClientes();
  const { data: motivos } = useMotivos();

  const [codCliente, setCodCliente] = useState<string>(params.get("cliente") ?? "");
  const [motivoKey, setMotivoKey] = useState<string>("");
  const [fecha, setFecha] = useState<string>(hoyISO());
  const [busqueda, setBusqueda] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [transcripcion, setTranscripcion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  const motivo = useMemo(() => motivos?.find((m) => m.key === motivoKey), [motivos, motivoKey]);
  const cliente = useMemo(
    () => clientes?.find((c) => String(c.cod_cliente) === codCliente),
    [clientes, codCliente],
  );

  const opciones = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    const list = clientes ?? [];
    if (!term) return list.slice(0, 30);
    return list
      .filter((c) => c.cliente.toLowerCase().includes(term) || String(c.cod_cliente).includes(term))
      .slice(0, 30);
  }, [clientes, busqueda]);

  useEffect(() => {
    if (!motivoKey && motivos?.length) setMotivoKey(motivos[0].key);
  }, [motivos, motivoKey]);

  useEffect(() => {
    setValores({});
  }, [motivoKey]);

  const procesarAudio = async (blob: Blob) => {
    if (!motivo) return;
    setProcessing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "nota.wav");
      form.append("motivo_nombre", motivo.nombre);
      form.append("cliente_nombre", cliente?.cliente ?? "");
      form.append(
        "campos",
        JSON.stringify(
          motivo.campos.map((c) => ({
            campo_key: c.campo_key,
            label: c.label,
            ayuda: c.ayuda,
            tipo: c.tipo,
            is_required: c.is_required,
          })),
        ),
      );

      const { data, error } = await supabase.functions.invoke("visita-voz", { body: form });
      if (error) throw new Error((await (error as { context?: Response }).context?.text?.()) || error.message);
      const res = data as { transcripcion?: string; campos?: Record<string, unknown>; error?: string };
      if (res.error) throw new Error(res.error);

      setTranscripcion(res.transcripcion ?? "");
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.campos ?? {})) if (v != null) next[k] = String(v);
      setValores(next);
      toast({ title: "Informe preliminar listo", description: "Revísalo y corrige lo que haga falta antes de guardar." });
    } catch (e) {
      toast({ title: "Error procesando la nota", description: (e as Error).message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const guardar = async () => {
    if (!codCliente || !motivo) {
      toast({ title: "Faltan datos", description: "Selecciona cliente y motivo.", variant: "destructive" });
      return;
    }
    const faltan = motivo.campos.filter((c) => c.is_required && !valores[c.campo_key]?.trim());
    if (faltan.length) {
      toast({
        title: "Campos obligatorios sin rellenar",
        description: faltan.map((c) => c.label).join(", "),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("visitas").insert({
      cod_cliente: Number(codCliente),
      motivo_key: motivo.key,
      fecha,
      user_id: user?.id ?? null,
      vendedor: employeeCode ?? null,
      transcripcion: transcripcion || null,
      observaciones: observaciones || null,
      campos: valores,
      estado: "registrada",
      origen: "app",
    });
    setSaving(false);

    if (error) {
      toast({ title: "No se ha podido guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Visita guardada" });
    navigate(`/clientes/${codCliente}`);
  };

  const hayResultado = Object.keys(valores).length > 0;

  return (
    <div className="space-y-4 pb-24">
      <Link to="/visitas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Visitas
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registrar visita</h1>
        <p className="text-sm text-muted-foreground">Dicta la visita y la IA prepara el informe por ti</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Datos de la visita</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            {cliente ? (
              <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{cliente.cliente}</p>
                  <p className="text-xs text-muted-foreground">#{cliente.cod_cliente} · {cliente.localidad ?? "—"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setCodCliente(""); setBusqueda(""); }}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <>
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar cliente por nombre o código…"
                />
                <div className="max-h-56 space-y-1 overflow-auto rounded-md border p-1">
                  {opciones.map((c) => (
                    <button
                      key={c.cod_cliente}
                      type="button"
                      onClick={() => setCodCliente(String(c.cod_cliente))}
                      className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{c.cliente}</span>
                      <span className="ml-2 text-xs text-muted-foreground">#{c.cod_cliente}</span>
                    </button>
                  ))}
                  {opciones.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">Sin resultados.</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={motivoKey} onValueChange={setMotivoKey}>
                <SelectTrigger><SelectValue placeholder="Selecciona motivo" /></SelectTrigger>
                <SelectContent>
                  {(motivos ?? []).filter((m) => m.is_active).map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {motivo?.descripcion && <p className="text-xs text-muted-foreground">{motivo.descripcion}</p>}
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Nota de voz</CardTitle></CardHeader>
        <CardContent>
          <VoiceRecorder
            onAudio={procesarAudio}
            disabled={!motivo || !codCliente}
            processing={processing}
            hasResult={hayResultado}
          />
          {transcripcion && (
            <Collapsible className="mt-4">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <FileText className="h-4 w-4" /> Ver transcripción
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                {transcripcion}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {motivo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              3. Informe
              {hayResultado && <Badge variant="secondary" className="gap-1"><Wand2 className="h-3 w-3" />Propuesta IA</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {motivo.campos.map((c) => (
              <div key={c.campo_key} className="space-y-1.5">
                <Label>
                  {c.label} {c.is_required && <span className="text-destructive">*</span>}
                </Label>
                {c.tipo === "numero" ? (
                  <Input
                    type="number"
                    value={valores[c.campo_key] ?? ""}
                    onChange={(e) => setValores((v) => ({ ...v, [c.campo_key]: e.target.value }))}
                  />
                ) : c.tipo === "fecha" ? (
                  <Input
                    type="date"
                    value={valores[c.campo_key] ?? ""}
                    onChange={(e) => setValores((v) => ({ ...v, [c.campo_key]: e.target.value }))}
                  />
                ) : c.tipo === "select" ? (
                  <Select
                    value={valores[c.campo_key] ?? ""}
                    onValueChange={(val) => setValores((v) => ({ ...v, [c.campo_key]: val }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecciona una opción" /></SelectTrigger>
                    <SelectContent>
                      {c.opciones.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : c.tipo === "booleano" ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={valores[c.campo_key] === "si"}
                      onCheckedChange={(val) => setValores((v) => ({ ...v, [c.campo_key]: val ? "si" : "no" }))}
                    />
                    <span className="text-sm text-muted-foreground">
                      {valores[c.campo_key] === "si" ? "Sí" : "No"}
                    </span>
                  </div>
                ) : c.tipo === "texto" ? (
                  <Input
                    placeholder={c.ayuda ?? ""}
                    value={valores[c.campo_key] ?? ""}
                    onChange={(e) => setValores((v) => ({ ...v, [c.campo_key]: e.target.value }))}
                  />
                ) : (
                  <Textarea
                    rows={3}
                    placeholder={c.ayuda ?? ""}
                    value={valores[c.campo_key] ?? ""}
                    onChange={(e) => setValores((v) => ({ ...v, [c.campo_key]: e.target.value }))}
                  />
                )}
                {c.ayuda && c.tipo !== "texto" && c.tipo !== "texto_largo" && (
                  <p className="text-xs text-muted-foreground">{c.ayuda}</p>
                )}
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>Observaciones adicionales</Label>
              <Textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button className="flex-1" onClick={guardar} disabled={saving || !codCliente || !motivo}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar visita
          </Button>
        </div>
      </div>
    </div>
  );
}
