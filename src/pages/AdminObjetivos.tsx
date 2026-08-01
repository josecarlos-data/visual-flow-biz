import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Wand2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { eur, pct } from "@/lib/format";
import { etiquetaCorte } from "@/lib/projectionQuincenal";
import {
  anioActual,
  useObjetivosMutations,
  useObjetivosSeguimiento,
  usePropuestaObjetivos,
  useVendedoresObjetivos,
  type ObjetivoInput,
  type ObjetivoSeguimiento,
} from "@/hooks/useObjetivos";

type Borrador = ObjetivoInput & { id?: string };

const vacio = (anio: number): Borrador => ({
  anio,
  tipo: "cartera",
  vendedor: "",
  cod_vendedor: null,
  ruta: null,
  importe_objetivo: 0,
  base_anio_anterior: 0,
  porcentaje: 5,
  nota: "",
  activo: true,
});

export default function AdminObjetivos() {
  const [anio, setAnio] = useState(anioActual());
  const [pctCrecimiento, setPctCrecimiento] = useState(5);
  const [abierto, setAbierto] = useState(false);
  const [propuestasAbierto, setPropuestasAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Borrador>(vacio(anioActual()));
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
  const [importes, setImportes] = useState<Record<string, number>>({});

  const { data: objetivos, isLoading } = useObjetivosSeguimiento(anio);
  const { data: vendedores } = useVendedoresObjetivos();
  const { data: propuestas, isLoading: cargandoPropuestas } = usePropuestaObjetivos(
    anio,
    pctCrecimiento,
    propuestasAbierto
  );
  const { guardar, guardarLote, borrar } = useObjetivosMutations();

  const corte = objetivos?.[0]?.quincena_corte ?? 0;

  const listaVendedores = useMemo(
    () => Array.from(new Set((vendedores ?? []).map((v) => v.vendedor))).sort(),
    [vendedores]
  );
  const rutasEspeciales = useMemo(
    () =>
      Array.from(
        new Set((vendedores ?? []).map((v) => v.ruta_especial).filter((r): r is string => !!r))
      ).sort(),
    [vendedores]
  );

  const existentes = useMemo(() => {
    const s = new Set<string>();
    for (const o of objetivos ?? []) s.add(`${o.tipo}|${o.vendedor}|${o.ruta ?? ""}`);
    return s;
  }, [objetivos]);

  const propuestasNuevas = useMemo(
    () => (propuestas ?? []).filter((p) => !existentes.has(`${p.tipo}|${p.vendedor}|${p.ruta ?? ""}`)),
    [propuestas, existentes]
  );

  const abrirNuevo = () => {
    setBorrador(vacio(anio));
    setAbierto(true);
  };

  const abrirEdicion = (o: ObjetivoSeguimiento) => {
    setBorrador({
      id: o.id,
      anio,
      tipo: o.tipo,
      vendedor: o.vendedor,
      cod_vendedor: o.cod_vendedor,
      ruta: o.ruta,
      importe_objetivo: o.importe_objetivo,
      base_anio_anterior: o.total_anterior,
      porcentaje: 0,
      nota: o.nota ?? "",
      activo: o.activo,
    });
    setAbierto(true);
  };

  const onGuardar = async () => {
    if (!borrador.vendedor) {
      toast({ title: "Selecciona un comercial", variant: "destructive" });
      return;
    }
    if (borrador.tipo === "ruta" && !borrador.ruta) {
      toast({ title: "Selecciona una ruta especial", variant: "destructive" });
      return;
    }
    try {
      await guardar.mutateAsync(borrador);
      toast({ title: "Objetivo guardado" });
      setAbierto(false);
    } catch (e) {
      toast({ title: "No se pudo guardar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const onBorrar = async (id: string) => {
    try {
      await borrar.mutateAsync(id);
      toast({ title: "Objetivo eliminado" });
    } catch (e) {
      toast({ title: "No se pudo eliminar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const clavePropuesta = (p: { tipo: string; vendedor: string; ruta: string | null }) =>
    `${p.tipo}|${p.vendedor}|${p.ruta ?? ""}`;

  const aplicarPropuestas = async () => {
    const filas: ObjetivoInput[] = propuestasNuevas
      .filter((p) => seleccion[clavePropuesta(p)])
      .map((p) => ({
        anio,
        tipo: p.tipo,
        vendedor: p.vendedor,
        cod_vendedor: p.cod_vendedor,
        ruta: p.ruta,
        importe_objetivo: importes[clavePropuesta(p)] ?? p.importe_sugerido,
        base_anio_anterior: p.base_anio_anterior,
        porcentaje: p.tipo === "cartera" ? pctCrecimiento : 0,
      }));
    if (!filas.length) {
      toast({ title: "No hay propuestas seleccionadas", variant: "destructive" });
      return;
    }
    try {
      await guardarLote.mutateAsync(filas);
      toast({ title: `${filas.length} objetivos creados` });
      setPropuestasAbierto(false);
      setSeleccion({});
      setImportes({});
    } catch (e) {
      toast({ title: "No se pudieron crear", description: (e as Error).message, variant: "destructive" });
    }
  };

  const anios = [anioActual() + 1, anioActual(), anioActual() - 1];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Target className="h-5 w-5 text-primary" /> Objetivos comerciales
          </h1>
          <p className="text-sm text-muted-foreground">
            Proyección quincenal · {etiquetaCorte(corte)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anios.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setPropuestasAbierto(true)}>
            <Wand2 className="mr-2 h-4 w-4" /> Proponer objetivos
          </Button>
          <Button onClick={abrirNuevo}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo objetivo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comercial</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Objetivo</TableHead>
                    <TableHead className="text-right">Vendido</TableHead>
                    <TableHead className="text-right">% logrado</TableHead>
                    <TableHead className="text-right">{anio - 1} total</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(objetivos ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No hay objetivos para {anio}.
                      </TableCell>
                    </TableRow>
                  )}
                  {(objetivos ?? []).map((o) => {
                    const logrado = o.importe_objetivo > 0 ? (o.vendido / o.importe_objetivo) * 100 : 0;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">
                          {o.vendedor}
                          {!o.activo && <Badge variant="outline" className="ml-2">Inactivo</Badge>}
                        </TableCell>
                        <TableCell>
                          {o.tipo === "cartera" ? <Badge variant="secondary">Cartera</Badge> : <Badge>{o.ruta}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{eur(o.importe_objetivo, 2)}</TableCell>
                        <TableCell className="text-right">{eur(o.vendido, 2)}</TableCell>
                        <TableCell className="text-right">{pct(logrado)}</TableCell>
                        <TableCell className="text-right">{eur(o.total_anterior, 2)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => abrirEdicion(o)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onBorrar(o.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alta / edición */}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{borrador.id ? "Editar objetivo" : "Nuevo objetivo"} {anio}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select
                value={borrador.tipo}
                onValueChange={(v) => setBorrador({ ...borrador, tipo: v as "cartera" | "ruta", ruta: null })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cartera">Cartera (clientes habituales)</SelectItem>
                  <SelectItem value="ruta">Ruta especial (objetivo independiente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Comercial</Label>
              <Select
                value={borrador.vendedor}
                onValueChange={(v) => {
                  const info = (vendedores ?? []).find((x) => x.vendedor === v);
                  setBorrador({ ...borrador, vendedor: v, cod_vendedor: info?.cod_vendedor ?? null });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {listaVendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {borrador.tipo === "ruta" && (
              <div>
                <Label>Ruta especial</Label>
                <Select value={borrador.ruta ?? ""} onValueChange={(v) => setBorrador({ ...borrador, ruta: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {rutasEspeciales.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Importe objetivo (€)</Label>
              <Input
                type="number"
                value={borrador.importe_objetivo}
                onChange={(e) => setBorrador({ ...borrador, importe_objetivo: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label>Nota</Label>
              <Textarea
                value={borrador.nota ?? ""}
                onChange={(e) => setBorrador({ ...borrador, nota: e.target.value })}
                placeholder="Criterio con el que se ha fijado el objetivo"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={borrador.activo ?? true}
                onCheckedChange={(v) => setBorrador({ ...borrador, activo: v })}
              />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={onGuardar} disabled={guardar.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propuestas masivas */}
      <Dialog open={propuestasAbierto} onOpenChange={setPropuestasAbierto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Propuestas de objetivo {anio}</DialogTitle>
          </DialogHeader>

          <div className="flex items-end gap-3">
            <div>
              <Label>Crecimiento previsto sobre {anio - 1}</Label>
              <Input
                type="number"
                className="w-28"
                value={pctCrecimiento}
                onChange={(e) => setPctCrecimiento(Number(e.target.value))}
              />
            </div>
            <p className="pb-2 text-xs text-muted-foreground">
              Cartera = ventas {anio - 1} + {pctCrecimiento}%. Rutas especiales = mantener cifra. Todo editable.
            </p>
          </div>

          <div className="max-h-[50vh] overflow-auto">
            {cargandoPropuestas ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Comercial</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Base {anio - 1}</TableHead>
                    <TableHead className="text-right w-40">Objetivo {anio}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propuestasNuevas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        No hay propuestas pendientes.
                      </TableCell>
                    </TableRow>
                  )}
                  {propuestasNuevas.map((p) => {
                    const k = clavePropuesta(p);
                    return (
                      <TableRow key={k}>
                        <TableCell>
                          <Switch
                            checked={!!seleccion[k]}
                            onCheckedChange={(v) => setSeleccion({ ...seleccion, [k]: v })}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{p.vendedor}</TableCell>
                        <TableCell>
                          {p.tipo === "cartera" ? <Badge variant="secondary">Cartera</Badge> : <Badge>{p.ruta}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{eur(p.base_anio_anterior, 2)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="text-right"
                            value={importes[k] ?? p.importe_sugerido}
                            onChange={(e) => setImportes({ ...importes, [k]: Number(e.target.value) })}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const todos: Record<string, boolean> = {};
                const alguno = propuestasNuevas.some((p) => seleccion[clavePropuesta(p)]);
                for (const p of propuestasNuevas) todos[clavePropuesta(p)] = !alguno;
                setSeleccion(todos);
              }}
            >
              {propuestasNuevas.some((p) => seleccion[clavePropuesta(p)]) ? "Quitar selección" : "Seleccionar todos"}
            </Button>
            <Button onClick={aplicarPropuestas} disabled={guardarLote.isPending}>
              Crear seleccionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
