import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { eur } from "@/hooks/useCrm";
import { getYearColor } from "@/lib/yearColors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, TrendingDown, Percent, Users, Euro, Package } from "lucide-react";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface MensualRow { anio: number; mes: number; importe: number; margen: number; unidades: number }
interface KpiRow { anio: number; importe: number; margen: number; unidades: number; clientes: number; lineas: number }
interface TopCliente { cod_cliente: number; cliente: string; vendedor: string | null; importe: number; margen: number }
interface TopDim { importe: number; margen: number; familia?: string; marca?: string }
interface AlertaRow {
  tipo: string;
  cod_cliente: number;
  cliente: string;
  vendedor: string | null;
  valor: number;
  valor_ref: number;
  dias: number | null;
  etiqueta: string | null;
  situacion_categoria: string | null;
}

const num = (v: unknown) => Number(v ?? 0);

export default function Ventas() {
  const { verMargen } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mensual, setMensual] = useState<MensualRow[]>([]);
  const [kpis, setKpis] = useState<KpiRow[]>([]);
  const [topClientes, setTopClientes] = useState<TopCliente[]>([]);
  const [topFamilias, setTopFamilias] = useState<TopDim[]>([]);
  const [topMarcas, setTopMarcas] = useState<TopDim[]>([]);
  const [alertas, setAlertas] = useState<AlertaRow[]>([]);
  const [verTodasAlertas, setVerTodasAlertas] = useState(false);

  const anioActual = useMemo(
    () => (kpis.length ? Math.max(...kpis.map((k) => k.anio)) : new Date().getFullYear()),
    [kpis]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [mRes, kRes, aRes] = await Promise.all([
        supabase.rpc("panel_ventas_mensual" as any),
        supabase.rpc("panel_ventas_kpis" as any),
        supabase.rpc("panel_alertas" as any, { _limite: 25, _incluir_excluidos: true } as any),
      ]);
      const err = mRes.error ?? kRes.error ?? aRes.error;
      setErrorMsg(err ? err.message : null);
      setMensual(((mRes.data as any[]) ?? []).map((r) => ({
        anio: num(r.anio), mes: num(r.mes), importe: num(r.importe), margen: num(r.margen), unidades: num(r.unidades),
      })));
      setKpis(((kRes.data as any[]) ?? []).map((r) => ({
        anio: num(r.anio), importe: num(r.importe), margen: num(r.margen), unidades: num(r.unidades),
        clientes: num(r.clientes), lineas: num(r.lineas),
      })));
      setAlertas(((aRes.data as any[]) ?? []).map((r) => ({
        tipo: r.tipo, cod_cliente: num(r.cod_cliente), cliente: r.cliente, vendedor: r.vendedor,
        valor: num(r.valor), valor_ref: num(r.valor_ref), dias: r.dias === null ? null : num(r.dias),
        etiqueta: r.etiqueta ?? null, situacion_categoria: r.situacion_categoria ?? null,
      })));
      setLoading(false);
    })();
  }, []);



  useEffect(() => {
    if (!anioActual) return;
    (async () => {
      const [cRes, fRes, brRes] = await Promise.all([
        supabase.rpc("panel_top_clientes" as any, { _anio: anioActual, _limite: 10 } as any),
        supabase.rpc("panel_top_familias" as any, { _anio: anioActual, _limite: 10 } as any),
        supabase.rpc("panel_top_marcas" as any, { _anio: anioActual, _limite: 10 } as any),
      ]);
      const err2 = cRes.error ?? fRes.error ?? brRes.error;
      if (err2) setErrorMsg(err2.message);
      setTopClientes(((cRes.data as any[]) ?? []).map((r) => ({
        cod_cliente: num(r.cod_cliente), cliente: r.cliente, vendedor: r.vendedor,
        importe: num(r.importe), margen: num(r.margen),
      })));
      setTopFamilias(((fRes.data as any[]) ?? []).map((r) => ({ familia: r.familia ?? "Sin familia", importe: num(r.importe), margen: num(r.margen) })));
      setTopMarcas(((brRes.data as any[]) ?? []).map((r) => ({ marca: r.marca ?? "Sin marca", importe: num(r.importe), margen: num(r.margen) })));
    })();

  }, [anioActual]);

  const anios = useMemo(() => [...new Set(mensual.map((m) => m.anio))].sort(), [mensual]);

  const serieMensual = useMemo(() => {
    return MESES.map((nombre, i) => {
      const row: Record<string, number | string> = { mes: nombre };
      anios.forEach((a) => {
        const f = mensual.find((m) => m.anio === a && m.mes === i + 1);
        if (f) row[String(a)] = Math.round(f.importe);
      });
      return row;
    });
  }, [mensual, anios]);

  const kpiActual = kpis.find((k) => k.anio === anioActual);
  const kpiPrevio = kpis.find((k) => k.anio === anioActual - 1);

  // YTD comparable: mismo número de meses con datos
  const mesesConDatos = mensual.filter((m) => m.anio === anioActual).length;
  const ytdPrevio = mensual
    .filter((m) => m.anio === anioActual - 1 && m.mes <= mesesConDatos)
    .reduce((s, m) => s + m.importe, 0);
  const variacion = ytdPrevio > 0 && kpiActual ? ((kpiActual.importe - ytdPrevio) / ytdPrevio) * 100 : null;
  const margenPct = kpiActual && kpiActual.importe > 0 ? (kpiActual.margen / kpiActual.importe) * 100 : 0;

  const alertasPorTipo = (tipo: string) => alertas.filter((a) => a.tipo === tipo);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Panel de Ventas</h1>
        <p className="text-muted-foreground">Rendimiento, rentabilidad y alertas comerciales {anioActual}</p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No se han podido cargar algunos datos: {errorMsg}</span>
        </div>
      )}



      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Euro className="h-4 w-4" />}
          label={`Facturación ${anioActual}`}
          value={eur(kpiActual?.importe ?? 0)}
          hint={variacion !== null ? `${variacion >= 0 ? "+" : ""}${variacion.toFixed(1)}% vs ${anioActual - 1} YTD` : undefined}
          positive={variacion !== null ? variacion >= 0 : undefined}
        />
        {verMargen && (
          <Kpi
            icon={<Percent className="h-4 w-4" />}
            label="Margen"
            value={eur(kpiActual?.margen ?? 0)}
            hint={`${margenPct.toFixed(1)}% sobre ventas`}
          />
        )}
        <Kpi icon={<Users className="h-4 w-4" />} label="Clientes activos" value={String(kpiActual?.clientes ?? 0)} hint={`${kpiPrevio?.clientes ?? 0} en ${anioActual - 1}`} />
        <Kpi icon={<Package className="h-4 w-4" />} label="Líneas de venta" value={(kpiActual?.lineas ?? 0).toLocaleString("es-ES")} />
      </div>

      <Card>
        <CardHeader><CardTitle>Evolución mensual</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serieMensual} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Legend />
              {anios.map((a) => (
                <Line key={a} type="monotone" dataKey={String(a)} stroke={getYearColor(a, anioActual)} strokeWidth={a === anioActual ? 2.5 : 1.5} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Alertas comerciales</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="caida">
            <TabsList className="mb-3">
              <TabsTrigger value="caida">Caídas ({alertasPorTipo("caida").length})</TabsTrigger>
              <TabsTrigger value="fuga">Riesgo fuga ({alertasPorTipo("fuga").length})</TabsTrigger>
              {verMargen && <TabsTrigger value="margen_bajo">Margen bajo ({alertasPorTipo("margen_bajo").length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="caida" className="space-y-2">
              {alertasPorTipo("caida").length === 0 && <Vacio />}
              {alertasPorTipo("caida").map((a) => (
                <FilaAlerta key={`c-${a.cod_cliente}`} a={a}
                  detalle={`${eur(a.valor)} vs ${eur(a.valor_ref)} el año pasado`}
                  badge={<Badge variant="destructive" className="shrink-0"><TrendingDown className="mr-1 h-3 w-3" />{a.valor_ref > 0 ? `${(((a.valor - a.valor_ref) / a.valor_ref) * 100).toFixed(0)}%` : "—"}</Badge>} />
              ))}
            </TabsContent>

            <TabsContent value="fuga" className="space-y-2">
              {alertasPorTipo("fuga").length === 0 && <Vacio />}
              {alertasPorTipo("fuga").map((a) => (
                <FilaAlerta key={`f-${a.cod_cliente}`} a={a}
                  detalle={`Histórico ${eur(a.valor)}`}
                  badge={<Badge variant="outline" className="shrink-0">{a.dias} días sin comprar</Badge>} />
              ))}
            </TabsContent>

            {verMargen && (
              <TabsContent value="margen_bajo" className="space-y-2">
                {alertasPorTipo("margen_bajo").length === 0 && <Vacio />}
                {alertasPorTipo("margen_bajo").map((a) => (
                  <FilaAlerta key={`m-${a.cod_cliente}`} a={a}
                    detalle={`${eur(a.valor)} facturados`}
                    badge={<Badge variant="secondary" className="shrink-0">{a.valor_ref.toFixed(1)}% margen</Badge>} />
                ))}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top 10 clientes {anioActual}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topClientes.map((c, i) => (
              <Link key={c.cod_cliente} to={`/clientes/${c.cod_cliente}`} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm transition-colors hover:bg-accent">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="truncate">{c.cliente}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-medium">{eur(c.importe)}</span>
                  {verMargen && c.importe > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">{((c.margen / c.importe) * 100).toFixed(1)}%</span>
                  )}
                </span>
              </Link>
            ))}
            {topClientes.length === 0 && <Vacio />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top familias {anioActual}</CardTitle></CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFamilias} layout="vertical" margin={{ top: 5, right: 20, left: 90, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <YAxis type="category" dataKey="familia" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => eur(Number(v))} />
                <Bar dataKey="importe" fill={getYearColor(anioActual, anioActual)} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top marcas {anioActual}</CardTitle></CardHeader>
        <CardContent className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topMarcas} layout="vertical" margin={{ top: 5, right: 20, left: 90, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <YAxis type="category" dataKey="marca" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="importe" fill={getYearColor(anioActual - 1, anioActual)} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, hint, positive }: { icon: React.ReactNode; label: string; value: string; hint?: string; positive?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
        {hint && (
          <div className={`mt-1 text-xs ${positive === undefined ? "text-muted-foreground" : positive ? "text-primary" : "text-destructive"}`}>{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}

function FilaAlerta({ a, detalle, badge }: { a: AlertaRow; detalle: string; badge: React.ReactNode }) {
  return (
    <Link to={`/clientes/${a.cod_cliente}`} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm transition-colors hover:bg-accent">
      <span className="min-w-0">
        <span className="block truncate font-medium">{a.cliente}</span>
        <span className="block truncate text-xs text-muted-foreground">{detalle}{a.vendedor ? ` · ${a.vendedor}` : ""}</span>
      </span>
      {badge}
    </Link>
  );
}

function Vacio() {
  return <p className="py-4 text-center text-sm text-muted-foreground">Sin registros</p>;
}
