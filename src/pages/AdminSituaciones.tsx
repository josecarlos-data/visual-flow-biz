import { useMemo, useState } from "react";
import { Download, Plus, Pencil, Trash2, Search, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  useSituaciones, useSituacionesMutations, useClientes,
  CATEGORIAS_SITUACION, etiquetaCategoria, fechaCorta, hoyISO,
  type SituacionCliente,
} from "@/hooks/useCrm";

type Borrador = Partial<SituacionCliente> & { cod_cliente?: number };

const vacio: Borrador = { categoria: "otros", etiqueta: "", nota: "", activo: true, desde: hoyISO(), hasta: null };

export default function AdminSituaciones() {
  const { data: situaciones, isLoading } = useSituaciones();
  const { data: clientes } = useClientes(false, "alfabetico");
  const { guardar, borrar } = useSituacionesMutations();

  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Borrador>(vacio);
  const [buscaCliente, setBuscaCliente] = useState("");

  const nombrePorCod = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of clientes ?? []) m.set(c.cod_cliente, c.cliente);
    return m;
  }, [clientes]);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (situaciones ?? []).filter((s) => {
      if (filtroEstado === "activas" && !s.activo) return false;
      if (filtroEstado === "inactivas" && s.activo) return false;
      if (!term) return true;
      const nombre = nombrePorCod.get(s.cod_cliente) ?? "";
      return (
        nombre.toLowerCase().includes(term) ||
        String(s.cod_cliente).includes(term) ||
        s.etiqueta.toLowerCase().includes(term) ||
        etiquetaCategoria(s.categoria).toLowerCase().includes(term)
      );
    });
  }, [situaciones, q, filtroEstado, nombrePorCod]);

  const candidatos = useMemo(() => {
    const term = buscaCliente.trim().toLowerCase();
    if (!term) return [];
    return (clientes ?? [])
      .filter((c) => c.cliente.toLowerCase().includes(term) || String(c.cod_cliente).includes(term))
      .slice(0, 8);
  }, [clientes, buscaCliente]);

  const abrirNueva = () => {
    setBorrador({ ...vacio });
    setBuscaCliente("");
    setAbierto(true);
  };

  const abrirEdicion = (s: SituacionCliente) => {
    setBorrador({ ...s });
    setBuscaCliente(nombrePorCod.get(s.cod_cliente) ?? String(s.cod_cliente));
    setAbierto(true);
  };

  const onGuardar = async () => {
    if (!borrador.cod_cliente || !borrador.etiqueta?.trim()) {
      toast({ title: "Faltan datos", description: "Selecciona un cliente e indica la etiqueta.", variant: "destructive" });
      return;
    }
    try {
      await guardar.mutateAsync({
        ...borrador,
        cod_cliente: borrador.cod_cliente,
        etiqueta: borrador.etiqueta.trim(),
        hasta: borrador.hasta || null,
      } as never);
      toast({ title: "Situación guardada" });
      setAbierto(false);
    } catch (e) {
      toast({ title: "No se ha podido guardar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const onBorrar = async (id: string) => {
    try {
      await borrar.mutateAsync(id);
      toast({ title: "Situación eliminada" });
    } catch (e) {
      toast({ title: "No se ha podido eliminar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const exportarCsv = () => {
    const cab = ["Código", "Cliente", "Categoría", "Etiqueta", "Nota", "Estado", "Desde", "Hasta"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const filas = filtradas.map((s) => [
      s.cod_cliente,
      nombrePorCod.get(s.cod_cliente) ?? "",
      etiquetaCategoria(s.categoria),
      s.etiqueta,
      s.nota ?? "",
      s.activo ? "Activa" : "Inactiva",
      s.desde,
      s.hasta ?? "",
    ]);
    const csv = "\uFEFF" + [cab, ...filas].map((f) => f.map(esc).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `situaciones_cliente_${hoyISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Situaciones de cliente</h1>
          <p className="text-sm text-muted-foreground">
            Casos conocidos (concurso, cierre, licitación perdida…) que se ocultan de las alertas comerciales sin alterar las ventas.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={exportarCsv} disabled={filtradas.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={abrirNueva}>
            <Plus className="mr-2 h-4 w-4" /> Nueva situación
          </Button>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex gap-2 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Las ventas, márgenes y rankings nunca se filtran por estas situaciones: los importes siguen siendo los reales.
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por cliente, etiqueta o categoría…" className="pl-9" />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="activas">Solo activas</SelectItem>
            <SelectItem value="inactivas">Solo inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtradas.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Todavía no hay situaciones registradas.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead className="hidden md:table-cell">Nota</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate font-medium">{nombrePorCod.get(s.cod_cliente) ?? `Cliente ${s.cod_cliente}`}</p>
                      <p className="text-xs text-muted-foreground">#{s.cod_cliente}</p>
                    </TableCell>
                    <TableCell className="text-sm">{etiquetaCategoria(s.categoria)}</TableCell>
                    <TableCell>
                      <Badge variant={s.activo ? "secondary" : "outline"}>{s.etiqueta}</Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-[280px] md:table-cell">
                      <p className="truncate text-xs text-muted-foreground">{s.nota}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.activo ? "Activa" : "Inactiva"} · desde {fechaCorta(s.desde)}
                      {s.hasta ? ` hasta ${fechaCorta(s.hasta)}` : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicion(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onBorrar(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{borrador.id ? "Editar situación" : "Nueva situación"}</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input
                value={buscaCliente}
                onChange={(e) => { setBuscaCliente(e.target.value); setBorrador((b) => ({ ...b, cod_cliente: undefined })); }}
                placeholder="Buscar por nombre o código…"
              />
              {borrador.cod_cliente ? (
                <p className="text-xs text-muted-foreground">Seleccionado: #{borrador.cod_cliente}</p>
              ) : (
                candidatos.map((c) => (
                  <button
                    key={c.cod_cliente}
                    type="button"
                    className="block w-full truncate rounded-md border px-2 py-1 text-left text-sm hover:bg-accent"
                    onClick={() => { setBorrador((b) => ({ ...b, cod_cliente: c.cod_cliente })); setBuscaCliente(c.cliente); }}
                  >
                    {c.cliente} <span className="text-xs text-muted-foreground">#{c.cod_cliente}</span>
                  </button>
                ))
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={borrador.categoria ?? "otros"} onValueChange={(v) => setBorrador((b) => ({ ...b, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_SITUACION.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Etiqueta corta</Label>
              <Input
                value={borrador.etiqueta ?? ""}
                onChange={(e) => setBorrador((b) => ({ ...b, etiqueta: e.target.value }))}
                placeholder="Ej. Licitación perdida"
                maxLength={40}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nota explicativa</Label>
              <Textarea
                value={borrador.nota ?? ""}
                onChange={(e) => setBorrador((b) => ({ ...b, nota: e.target.value }))}
                placeholder="Contexto para el comercial…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input type="date" value={borrador.desde ?? hoyISO()} onChange={(e) => setBorrador((b) => ({ ...b, desde: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta (opcional)</Label>
                <Input type="date" value={borrador.hasta ?? ""} onChange={(e) => setBorrador((b) => ({ ...b, hasta: e.target.value || null }))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Situación activa</p>
                <p className="text-xs text-muted-foreground">Si se desactiva, el cliente vuelve a aparecer en las alertas.</p>
              </div>
              <Switch checked={borrador.activo ?? true} onCheckedChange={(v) => setBorrador((b) => ({ ...b, activo: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={onGuardar} disabled={guardar.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
