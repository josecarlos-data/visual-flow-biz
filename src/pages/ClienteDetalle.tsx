import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Phone, Mail, MapPin, Route as RouteIcon, Sparkles, Loader2,
  TrendingUp, TrendingDown, Package, Plus, AlertTriangle, Target, MessageSquareQuote,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCliente, useClienteVentas, useClienteProductos, useClienteVisitas, useMotivos, eur, fechaCorta } from "@/hooks/useCrm";

interface Insights {
  resumen: string;
  alertas: string[];
  oportunidades: string[];
  argumentario: string[];
  generado_en?: string;
}

export default function ClienteDetalle() {
  const { cod } = useParams();
  const codNum = cod ? Number(cod) : null;

  const { data: cliente, isLoading } = useCliente(codNum);
  const { data: ventas } = useClienteVentas(codNum);
  const { data: productos } = useClienteProductos(codNum);
  const { data: visitas } = useClienteVisitas(codNum);
  const { data: motivos } = useMotivos();
  const [insights, setInsights] = useState<Insights | null>(null);

  const { data: cached } = useQuery({
    queryKey: ["crm_insights", codNum],
    enabled: codNum != null,
    queryFn: async () => {
      const { data } = await supabase.from("cliente_insights").select("*").eq("cod_cliente", codNum!).maybeSingle();
      return (data as unknown as Insights) ?? null;
    },
  });

  const shown = insights ?? cached ?? null;

  const generar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("cliente-insights", {
        body: { cod_cliente: codNum },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as Insights;
    },
    onSuccess: (d) => setInsights(d),
    onError: (e: Error) =>
      toast({ title: "No se ha podido generar el análisis", description: e.message, variant: "destructive" }),
  });

  const porAnio = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of ventas ?? []) map.set(v.anio, (map.get(v.anio) ?? 0) + Number(v.valor ?? 0));
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([anio, total]) => ({ anio: String(anio), total }));
  }, [ventas]);

  const variacion = useMemo(() => {
    if (porAnio.length < 2) return null;
    const prev = porAnio[porAnio.length - 2];
    const last = porAnio[porAnio.length - 1];
    if (!prev.total) return null;
    return ((last.total - prev.total) / prev.total) * 100;
  }, [porAnio]);

  const motivoNombre = (key: string | null) => motivos?.find((m) => m.key === key)?.nombre ?? key ?? "—";

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!cliente)
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Cliente no encontrado o sin acceso.
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Link to="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{cliente.cliente}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>#{cliente.cod_cliente}</span>
            {cliente.localidad && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{cliente.localidad}</span>}
            {cliente.telefono && <a href={`tel:${cliente.telefono}`} className="flex items-center gap-1 hover:text-foreground"><Phone className="h-3.5 w-3.5" />{cliente.telefono}</a>}
            {cliente.email && <a href={`mailto:${cliente.email}`} className="flex items-center gap-1 hover:text-foreground"><Mail className="h-3.5 w-3.5" />{cliente.email}</a>}
            {cliente.ruta && <Badge variant="secondary" className="gap-1"><RouteIcon className="h-3 w-3" />Ruta {cliente.ruta}</Badge>}
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link to={`/visitas/nueva?cliente=${cliente.cod_cliente}`}>
            <Plus className="mr-2 h-4 w-4" /> Nueva visita
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ventas último año</p>
            <p className="mt-1 text-xl font-bold">{eur(porAnio[porAnio.length - 1]?.total ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Variación anual</p>
            <p className={`mt-1 flex items-center gap-1 text-xl font-bold ${variacion == null ? "" : variacion >= 0 ? "text-primary" : "text-destructive"}`}>
              {variacion == null ? "—" : (
                <>
                  {variacion >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {variacion.toFixed(1)}%
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Referencias</p>
            <p className="mt-1 text-xl font-bold">{productos?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Última visita</p>
            <p className="mt-1 text-sm font-semibold">{visitas?.[0] ? fechaCorta(visitas[0].fecha) : "Sin visitas"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="visitas">Visitas</TabsTrigger>
          <TabsTrigger value="ia">Análisis IA</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Evolución de ventas por año</CardTitle></CardHeader>
            <CardContent className="h-64">
              {porAnio.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Sin datos de ventas.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porAnio} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="anio" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} className="text-xs" width={44} />
                    <Tooltip
                      formatter={(v: number) => eur(v)}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {(cliente.observaciones || cliente.direccion || cliente.tipo_cliente || cliente.delegacion) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Datos de ficha</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {cliente.direccion && <p><span className="text-muted-foreground">Dirección: </span>{cliente.direccion}</p>}
                {cliente.tipo_cliente && <p><span className="text-muted-foreground">Tipo: </span>{cliente.tipo_cliente}</p>}
                {cliente.delegacion && <p><span className="text-muted-foreground">Delegación: </span>{cliente.delegacion}</p>}
                {cliente.observaciones && <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Observaciones: </span>{cliente.observaciones}</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="productos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" />Productos comprados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!productos || productos.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Aún no hay datos de productos. Se cargarán con la sincronización del Excel.
                </p>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="hidden sm:table-cell">Familia</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Uds.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productos.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate font-medium">{p.referencia}</p>
                            {p.descripcion && <p className="truncate text-xs text-muted-foreground">{p.descripcion}</p>}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">{p.familia ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{eur(Number(p.importe), 2)}</TableCell>
                          <TableCell className="hidden text-right tabular-nums sm:table-cell">{Number(p.unidades)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitas" className="space-y-3">
          {!visitas || visitas.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Sin visitas registradas.</CardContent></Card>
          ) : (
            visitas.map((v) => (
              <Card key={v.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{motivoNombre(v.motivo_key)}</Badge>
                    <span className="text-xs text-muted-foreground">{fechaCorta(v.fecha)}</span>
                  </div>
                  {Object.entries(v.campos ?? {}).filter(([, val]) => val).map(([k, val]) => (
                    <p key={k} className="text-sm">
                      <span className="text-muted-foreground">{k.replace(/_/g, " ")}: </span>
                      {String(val)}
                    </p>
                  ))}
                  {v.observaciones && <p className="whitespace-pre-wrap text-sm">{v.observaciones}</p>}
                  {v.origen === "gespromo" && <Badge variant="outline" className="text-xs">Importada de Gespromo</Badge>}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="ia" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {shown?.generado_en ? `Generado ${new Date(shown.generado_en).toLocaleString("es-ES")}` : "Sin análisis todavía"}
            </p>
            <Button onClick={() => generar.mutate()} disabled={generar.isPending}>
              {generar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {shown ? "Regenerar" : "Generar análisis"}
            </Button>
          </div>

          {shown && (
            <div className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
                <CardContent><p className="text-sm leading-relaxed">{shown.resumen}</p></CardContent>
              </Card>
              {[
                { title: "Alertas", icon: AlertTriangle, items: shown.alertas },
                { title: "Oportunidades", icon: Target, items: shown.oportunidades },
                { title: "Argumentario para la próxima visita", icon: MessageSquareQuote, items: shown.argumentario },
              ].map(({ title, icon: Icon, items }) =>
                items?.length ? (
                  <Card key={title}>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4" />{title}</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {items.map((it, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {it}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null,
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
