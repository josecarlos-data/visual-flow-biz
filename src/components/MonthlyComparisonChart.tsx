import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";
import { useMemo, useState } from "react";
import { Users, BarChart3, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClientSparklines from "./ClientSparklines";
import { getYearColor } from "@/lib/yearColors";
import { calcularProyeccion } from "@/lib/projection";

interface MonthlyComparisonChartProps {
  data: ClienteConVentas[];
  selectedYears: number[];
  monthRange: [number, number];
}

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: true }).format(v);

export default function MonthlyComparisonChart({ data, selectedYears, monthRange }: MonthlyComparisonChartProps) {
  const isMobile = useIsMobile();
  const [showClientView, setShowClientView] = useState(false);
  const [cumulative, setCumulative] = useState(false);
  const [showProjection, setShowProjection] = useState(false);
  const latestYear = Math.max(...selectedYears);
  const prevYear = latestYear - 1;

  // Base monthly data
  const chartData = useMemo(() => {
    const monthlyTotals = new Map<string, Record<string, number>>();

    for (let m = monthRange[0]; m <= monthRange[1]; m++) {
      const key = MONTH_NAMES[m - 1];
      const entry: Record<string, number> = { mesNum: m };
      for (const year of selectedYears) {
        entry[`ventas_${year}`] = 0;
      }
      monthlyTotals.set(key, entry);
    }

    for (const row of data) {
      for (const vm of row.ventas_mensuales) {
        if (!selectedYears.includes(vm.anio)) continue;
        if (vm.mes < monthRange[0] || vm.mes > monthRange[1]) continue;
        const key = MONTH_NAMES[vm.mes - 1];
        const entry = monthlyTotals.get(key);
        if (entry) {
          entry[`ventas_${vm.anio}`] = (entry[`ventas_${vm.anio}`] || 0) + vm.valor;
        }
      }
    }

    return Array.from(monthlyTotals.entries()).map(([name, vals]) => ({ name, ...vals }));
  }, [data, selectedYears, monthRange]);

  // Projection data for latest year
  const projectionData = useMemo(() => {
    if (!showProjection) return null;

    // Gather all monthly values for latest and previous year across all clients
    const ventasActual: { mes: number; valor: number }[] = [];
    const ventasPrevio: { mes: number; valor: number }[] = [];

    for (const row of data) {
      for (const vm of row.ventas_mensuales) {
        if (vm.anio === latestYear) ventasActual.push({ mes: vm.mes, valor: vm.valor });
        if (vm.anio === prevYear) ventasPrevio.push({ mes: vm.mes, valor: vm.valor });
      }
    }

    return calcularProyeccion(ventasActual, ventasPrevio);
  }, [data, latestYear, prevYear, showProjection]);

  // Final display data (with cumulative + projection transforms)
  const displayData = useMemo(() => {
    let result = chartData.map((d) => ({ ...d }));

    // Merge projection into chart data
    if (showProjection && projectionData) {
      for (const entry of result) {
        const m = (entry as Record<string, unknown>).mesNum as number;
        const proj = projectionData.find((p) => p.mes === m);
        if (proj) {
          entry[`proy_${latestYear}`] = proj.valor;
        }
      }
    }

    // Cumulative transform
    if (cumulative) {
      const accumulators: Record<string, number> = {};
      for (const entry of result) {
        for (const year of selectedYears) {
          const key = `ventas_${year}`;
          accumulators[key] = (accumulators[key] || 0) + ((entry[key] as number) || 0);
          entry[key] = accumulators[key];
        }
        if (showProjection) {
          const projKey = `proy_${latestYear}`;
          accumulators[projKey] = (accumulators[projKey] || 0) + ((entry[projKey] as number) || 0);
          entry[projKey] = accumulators[projKey];
        }
      }
    }

    return result;
  }, [chartData, cumulative, showProjection, projectionData, selectedYears, latestYear]);

  const chartTitle = showClientView
    ? "Evolución Mensual por Cliente"
    : cumulative
      ? "Comparativa Acumulada por Año"
      : "Comparativa Mensual por Año";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{chartTitle}</CardTitle>
        <div className="flex items-center gap-1">
          {!showClientView && (
            <>
              <Button
                variant={cumulative ? "default" : "outline"}
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setCumulative((v) => !v)}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {isMobile ? "" : cumulative ? "Mensual" : "Acumulado"}
              </Button>
              <Button
                variant={showProjection ? "default" : "outline"}
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setShowProjection((v) => !v)}
              >
                <Activity className="h-3.5 w-3.5" />
                {isMobile ? "" : "Proyección"}
              </Button>
            </>
          )}
          <Button
            variant={showClientView ? "default" : "outline"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setShowClientView((v) => !v)}
          >
            {showClientView ? <BarChart3 className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
            {showClientView ? "Por año" : "Top 10"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showClientView ? (
          <ClientSparklines data={data} selectedYears={selectedYears} monthRange={monthRange} />
        ) : (
          <div className="h-[280px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData} margin={{ top: 5, right: isMobile ? 10 : 20, left: isMobile ? 0 : 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="fill-muted-foreground" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" width={isMobile ? 40 : 60} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend verticalAlign="top" height={36} />
                {selectedYears.map((year) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={`ventas_${year}`}
                    name={String(year)}
                    stroke={getYearColor(year, latestYear)}
                    strokeWidth={year === latestYear ? 2.5 : 2}
                    dot={{ r: isMobile ? 2 : 3 }}
                    activeDot={{ r: isMobile ? 4 : 5 }}
                  />
                ))}
                {showProjection && (
                  <Line
                    type="monotone"
                    dataKey={`proy_${latestYear}`}
                    name={`Proyección ${latestYear}`}
                    stroke={getYearColor(latestYear, latestYear)}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: isMobile ? 1.5 : 2.5 }}
                    activeDot={{ r: isMobile ? 3 : 4 }}
                    opacity={0.7}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
