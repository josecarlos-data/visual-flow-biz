import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { eur, eurK, pct } from "@/lib/format";
import {
  agruparPorMes,
  calcularProyeccionQuincenal,
  etiquetaCorte,
  ritmoNecesario,
} from "@/lib/projectionQuincenal";
import type { ObjetivoSeguimiento } from "@/hooks/useObjetivos";

interface Props {
  objetivo: ObjetivoSeguimiento;
  anio: number;
  compacto?: boolean;
}

export function ObjetivoCard({ objetivo, anio, compacto = false }: Props) {
  const calc = useMemo(() => {
    const actual = objetivo.series.filter((s) => s.anio === anio).map((s) => ({ q: s.q, valor: s.importe }));
    const previo = objetivo.series.filter((s) => s.anio === anio - 1).map((s) => ({ q: s.q, valor: s.importe }));
    return calcularProyeccionQuincenal(actual, previo, objetivo.quincena_corte);
  }, [objetivo, anio]);

  const meta = objetivo.importe_objetivo;
  const logrado = meta > 0 ? (calc.vendido / meta) * 100 : 0;
  const cumpleProyeccion = meta > 0 ? (calc.proyeccion / meta) * 100 : 0;
  const ritmo = ritmoNecesario(meta, calc.vendido, objetivo.quincena_corte);

  const semaforo =
    cumpleProyeccion >= 100
      ? { texto: "En objetivo", clase: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" }
      : cumpleProyeccion >= 90
        ? { texto: "Ajustado", clase: "bg-amber-500/15 text-amber-600 border-amber-500/30" }
        : { texto: "Por debajo", clase: "bg-destructive/15 text-destructive border-destructive/30" };

  const titulo = objetivo.tipo === "cartera" ? "Objetivo de cartera" : `Objetivo ruta ${objetivo.ruta}`;

  const datosGrafico = agruparPorMes(calc.puntos);

  const variacion =
    objetivo.vendido_anterior_ytd > 0
      ? ((calc.vendido - objetivo.vendido_anterior_ytd) / objetivo.vendido_anterior_ytd) * 100
      : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {titulo}
            <span className="ml-2 text-sm font-normal text-muted-foreground">{objetivo.vendedor}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {!objetivo.activo && <Badge variant="outline">Inactivo</Badge>}
            <Badge variant="outline" className={semaforo.clase}>{semaforo.texto}</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {anio} · {etiquetaCorte(objetivo.quincena_corte)}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato label="Objetivo" valor={eur(meta)} />
          <Dato label="Vendido" valor={eur(calc.vendido)} sub={variacion !== null ? `${variacion >= 0 ? "+" : ""}${pct(variacion)} vs ${anio - 1}` : undefined} />
          <Dato label="Proyección cierre" valor={eur(calc.proyeccion)} sub={meta > 0 ? `${pct(cumpleProyeccion)} del objetivo` : undefined} />
          <Dato label="Falta" valor={eur(ritmo.pendiente)} sub={ritmo.restantes > 0 ? `${eur(ritmo.porQuincena)} / quincena` : "año cerrado"} />
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Conseguido</span>
            <span>{pct(logrado)}</span>
          </div>
          <Progress value={Math.min(100, Math.max(0, logrado))} />
        </div>

        {!compacto && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datosGrafico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => eurK(v)} width={48} />
                <Tooltip
                  formatter={(v: number, name: string) => [eur(v), name]}
                  labelFormatter={(l: string) => {
                    const m = datosGrafico.find((d) => d.etiqueta === l);
                    return m?.parcial ? `${l} (quincena parcial)` : l;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="anterior"
                  name={`${anio - 1}`}
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.28}
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="real"
                  name={`${anio}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="proyectado"
                  name="Proyección"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  strokeOpacity={0.75}
                  dot={{ r: 2, strokeWidth: 0, fill: "hsl(var(--primary))", fillOpacity: 0.6 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {objetivo.nota && <p className="text-xs text-muted-foreground">{objetivo.nota}</p>}
      </CardContent>
    </Card>
  );
}

function Dato({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{valor}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
