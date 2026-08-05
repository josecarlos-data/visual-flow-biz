import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Wand2, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useClientes, useMotivos, hoyISO, crearBloques, type Motivo } from "@/hooks/useCrm";

interface BloqueForm {
  uid: string;
  motivoKey: string;
  valores: Record<string, string>;
  transcripcion: string;
}

const nuevoBloque = (motivoKey: string): BloqueForm => ({
  uid: crypto.randomUUID(),
  motivoKey,
  valores: {},
  transcripcion: "",
});

export default function NuevaVisita() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, employeeCode } = useAuth();
  const { data: clientes } = useClientes();
  const { data: motivos } = useMotivos();

  const [codCliente, setCodCliente] = useState<string>(params.get("cliente") ?? "");
  const [fecha, setFecha] = useState<string>(hoyISO());
  const [resultado, setResultado] = useState<string>("efectiva");
  const [tipo, setTipo] = useState<string>("cliente");
  const [busqueda, setBusqueda] = useState("");
  const [bloques, setBloques] = useState<BloqueForm[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const motivosActivos = useMemo(() => (motivos ?? []).filter((m) => m.is_active), [motivos]);
  const motivoDe = (key: string): Motivo | undefined => motivos?.find((m) => m.key === key);

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

  // Un bloque inicial en cuanto se conocen los motivos.
  useEffect(() => {
    if (!bloques.length && motivosActivos.length) setBloques([nuevoBloque(motivosActivos[0].key)]);
  }, [motivosActivos, bloques.length]);

  const actualizarBloque = (uid: string, patch: Partial<BloqueForm>) =>
    setBloques((bs) => bs.map((b) => (b.uid === uid ? { ...b, ...patch } : b)));

  const procesarAudio = async (uid: string, blob: Blob) => {
    const bloque = bloques.find((b) => b.uid === uid);
    const motivo = bloque && motivoDe(bloque.motivoKey);
    if (!bloque || !motivo) return;
    setProcesando(uid);
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

      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.campos ?? {})) if (v != null) next[k] = String(v);
      actualizarBloque(uid, { transcripcion: res.transcripcion ?? "", valores: next });
      toast({ title: "Informe preliminar listo", description: "Revísalo y corrige lo que haga falta antes de guardar." });
    } catch (e) {
      toast({ title: "Error procesando la nota", description: (e as Error).message, variant: "destructive" });
    } finally {
      setProcesando(null);
    }
  };

  /** Ubicación del comercial al registrar la visita (opcional, nunca bloquea el guardado). */
  const obtenerPosicion = () =>
    new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      const timer = setTimeout(() => resolve(null), 6000);
      navigator.geolocation.getCurrentPosition(
        (p) => {
          clearTimeout(timer);
          resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 6000 },
      );
    });

  /** Solo las visitas efectivas llevan bloques; el resto son intentos fallidos. */
  const esEfectiva = resultado === "efectiva";
  /** Los resultados presenciales deberían llevar GPS; una llamada, no. */
  const requiereGeo = tipo !== "llamada";

  const guardar = async () => {
    if (!codCliente) {
      toast({ title: "Faltan datos", description: "Selecciona un cliente.", variant: "destructive" });
      return;
    }
    if (esEfectiva && !bloques.length) {
      toast({ title: "Faltan datos", description: "Añade al menos un bloque a la visita.", variant: "destructive" });
      return;
    }
    if (esEfectiva) {
      const faltan: string[] = [];
      for (const b of bloques) {
        const m = motivoDe(b.motivoKey);
        if (!m) {
          toast({ title: "Faltan datos", description: "Selecciona el motivo de cada bloque.", variant: "destructive" });
          return;
        }
        for (const c of m.campos) if (c.is_required && !b.valores[c.campo_key]?.trim()) faltan.push(`${m.nombre}: ${c.label}`);
      }
      if (faltan.length) {
        toast({ title: "Campos obligatorios sin rellenar", description: faltan.join(", "), variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    const pos = await obtenerPosicion();
    if (!pos && requiereGeo) {
      toast({
        title: "Sin ubicación",
        description: "No se ha podido obtener el GPS. La visita se guarda marcada como sin geolocalización.",
      });
    }

    const transcripcionUnica = bloques
      .map((b) => b.transcripcion)
      .filter(Boolean)
      .join("\n\n");

    const { data: creada, error } = await supabase
      .from("visitas")
      .insert({
        cod_cliente: Number(codCliente),
        // legacy: se conserva el primer motivo para las vistas antiguas
        motivo_key: esEfectiva ? bloques[0]?.motivoKey ?? null : null,
        fecha,
        tipo,
        resultado_visita: resultado,
        user_id: user?.id ?? null,
        vendedor: employeeCode ?? null,
        transcripcion: esEfectiva ? transcripcionUnica || null : null,
        observaciones: observaciones || null,
        campos: {},
        estado: "registrada",
        origen: "app",
        latitud: pos?.lat ?? null,
        longitud: pos?.lng ?? null,
      } as never)
      .select("id")
      .single();

    if (error || !creada) {
      setSaving(false);
      toast({ title: "No se ha podido guardar", description: error?.message ?? "Error desconocido", variant: "destructive" });
      return;
    }

    try {
      if (esEfectiva) {
        await crearBloques(
          (creada as { id: string }).id,
          bloques.map((b) => ({ motivo_key: b.motivoKey, campos: b.valores })),
        );
      }
    } catch (e) {
      setSaving(false);
      toast({ title: "Visita guardada sin bloques", description: (e as Error).message, variant: "destructive" });
      return;
    }

    setSaving(false);

    // Geoposicionamiento progresivo: si el cliente aún no tiene ubicación, se la asignamos.
    if (pos) {
      await supabase.rpc("registrar_geo_cliente" as never, {
        _cod: Number(codCliente),
        _lat: pos.lat,
        _lng: pos.lng,
      } as never);
    }
    toast({ title: "Visita guardada" });
    navigate(`/clientes/${codCliente}`);
  };

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
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="ruta">Ruta</SelectItem>
                  <SelectItem value="llamada">Llamada</SelectItem>
                  <SelectItem value="agenda">Agenda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select value={resultado} onValueChange={setResultado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectiva">Efectiva</SelectItem>
                  <SelectItem value="cliente_ausente">Cliente ausente</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                  <SelectItem value="sin_acceso">Sin acceso</SelectItem>
                </SelectContent>
              </Select>
              {!esEfectiva && (
                <p className="text-xs text-muted-foreground">
                  La visita se registra sin bloques; solo con tus observaciones.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {esEfectiva && bloques.map((b, i) => {
        const motivo = motivoDe(b.motivoKey);
        const hayResultado = Object.keys(b.valores).length > 0;
        return (
          <Card key={b.uid}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                Bloque {i + 1}
                {hayResultado && <Badge variant="secondary" className="gap-1"><Wand2 className="h-3 w-3" />Propuesta IA</Badge>}
              </CardTitle>
              {bloques.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar bloque ${i + 1}`}
                  onClick={() => setBloques((bs) => bs.filter((x) => x.uid !== b.uid))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select
                  value={b.motivoKey}
                  onValueChange={(val) => actualizarBloque(b.uid, { motivoKey: val, valores: {} })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona motivo" /></SelectTrigger>
                  <SelectContent>
                    {motivosActivos.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {motivo?.descripcion && <p className="text-xs text-muted-foreground">{motivo.descripcion}</p>}
              </div>

              <VoiceRecorder
                onAudio={(blob) => procesarAudio(b.uid, blob)}
                disabled={!motivo || !codCliente || procesando !== null}
                processing={procesando === b.uid}
                hasResult={hayResultado}
              />
              {b.transcripcion && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <FileText className="h-4 w-4" /> Ver transcripción
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                    {b.transcripcion}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {camposVisibles(motivo?.campos ?? []).map((c) => (
                <CampoVisita
                  key={c.campo_key}
                  campo={c}
                  valores={b.valores}
                  catalogos={catalogos}
                  onChange={(patch) => actualizarBloque(b.uid, { valores: { ...b.valores, ...patch } })}
                />
              ))}

              {faltanValidacion(motivo).length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Para que la visita se dé por válida faltan: {faltanValidacion(motivo)
                    .filter((c) => !b.valores[c.campo_key]?.trim())
                    .map((c) => c.label)
                    .join(", ") || "nada"}
                </p>
              )}

            </CardContent>
          </Card>
        );
      })}

      {esEfectiva && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setBloques((bs) => [...bs, nuevoBloque(motivosActivos[0]?.key ?? "")])}
          disabled={!motivosActivos.length}
        >
          <Plus className="mr-2 h-4 w-4" /> Añadir otro bloque
        </Button>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            placeholder={esEfectiva ? "Observaciones adicionales de la visita…" : "¿Qué ha pasado? (cliente ausente, taller cerrado…)"}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button className="flex-1" onClick={guardar} disabled={saving || !codCliente || (esEfectiva && !bloques.length)}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar visita
          </Button>
        </div>
      </div>
    </div>
  );
}
