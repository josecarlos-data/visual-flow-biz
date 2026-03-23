import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";
import { getYearColor } from "@/lib/yearColors";
import { calcularProyeccion } from "@/lib/projection";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

interface SalesChartProps {
  data: ClienteConVentas[];
  groupBy: "vendedor" | "delegacion";
  title: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: true }).format(v);

const LATEST_YEAR = 2026;
const PREV_YEAR = 2025;

export default function SalesChart({ data, groupBy, title }: SalesChartProps) {
  const isMobile = useIsMobile();
  const [showProjection, setShowProjection] = useState(false);

  const chartData = useMemo(() => {
    const map = new Map<string, { ventas_2024: number; ventas_2025: number; ventas_2026: number; proy_2026: number }>();

    // First pass: aggregate real values
    for (const row of data) {
      const k = (row[groupBy] as string) || "Sin asignar";
      const prev = map.get(k) || { ventas_2024: 0, ventas_2025: 0, ventas_2026: 0, proy_2026: 0 };
      map.set(k, {
        ventas_2024: prev.ventas_2024 + row.ventas_2024,
        ventas_2025: prev.ventas_2025 + row.ventas_2025,
        ventas_2026: prev.ventas_2026 + row.ventas_2026,
        proy_2026: 0,
      });
    }

    // Calculate projection per group if needed
    if (showProjection) {
      const groupedData = new Map<string, { actual: { mes: number; valor: number }[]; previo: { mes: number; valor: number }[] }>();

      for (const row of data) {
        const k = (row[groupBy] as string) || "Sin asignar";
        if (!groupedData.has(k)) groupedData.set(k, { actual: [], previo: [] });
        const g = groupedData.get(k)!;
        for (const vm of row.ventas_mensuales) {
          if (vm.anio === LATEST_YEAR) g.actual.push({ mes: vm.mes, valor: vm.valor });
          if (vm.anio === PREV_YEAR) g.previo.push({ mes: vm.mes, valor: vm.valor });
        }
      }

      for (const [k, g] of groupedData.entries()) {
        const proj = calcularProyeccion(g.actual, g.previo);
        const totalProj = proj.reduce((acc, p) => acc + p.valor, 0);
        const entry = map.get(k);
        if (entry) entry.proy_2026 = totalProj;
      }
    }

    return Array.from(map.entries())
      .map(([name, vals]) => ({ name, ...vals }))
      .sort((a, b) => b.ventas_2025 - a.ventas_2025);
  }, [data, groupBy, showProjection]);

  const chart = (
    <div className="h-[280px] sm:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: isMobile ? 0 : 10, bottom: isMobile ? 50 : 90 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            angle={isMobile ? -45 : -35}
            textAnchor="end"
            interval={isMobile ? "preserveStartEnd" : 0}
            tick={{ fontSize: isMobile ? 10 : 11 }}
            className="fill-muted-foreground"
          />
          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" width={isMobile ? 40 : 60} />
          <Tooltip formatter={(v: number) => fmt(v)} />
          <Legend verticalAlign="top" height={36} />
          <Bar dataKey="ventas_2024" name="2024" fill={getYearColor(2024, LATEST_YEAR)} radius={[2, 2, 0, 0]} />
          <Bar dataKey="ventas_2025" name="2025" fill={getYearColor(2025, LATEST_YEAR)} radius={[2, 2, 0, 0]} />
          <Bar
            dataKey={showProjection ? "proy_2026" : "ventas_2026"}
            name={showProjection ? `Proy. ${LATEST_YEAR}` : String(LATEST_YEAR)}
            fill={getYearColor(LATEST_YEAR, LATEST_YEAR)}
            radius={[2, 2, 0, 0]}
            fillOpacity={showProjection ? 0.6 : 1}
            stroke={showProjection ? getYearColor(LATEST_YEAR, LATEST_YEAR) : undefined}
            strokeDasharray={showProjection ? "4 2" : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (!title) return chart;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          variant={showProjection ? "default" : "outline"}
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setShowProjection((v) => !v)}
        >
          <Activity className="h-3.5 w-3.5" />
          {isMobile ? "" : "Proyección"}
        </Button>
      </CardHeader>
      <CardContent>{chart}</CardContent>
    </Card>
  );
}
