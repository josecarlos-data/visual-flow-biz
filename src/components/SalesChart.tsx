import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";

interface SalesChartProps {
  data: ClienteConVentas[];
  groupBy: "vendedor" | "delegacion";
  title: string;
}

function aggregate(data: ClienteConVentas[], key: "vendedor" | "delegacion") {
  const map = new Map<string, { ventas_2024: number; ventas_2025: number; ventas_2026: number }>();
  for (const row of data) {
    const k = (row[key] as string) || "Sin asignar";
    const prev = map.get(k) || { ventas_2024: 0, ventas_2025: 0, ventas_2026: 0 };
    map.set(k, {
      ventas_2024: prev.ventas_2024 + row.ventas_2024,
      ventas_2025: prev.ventas_2025 + row.ventas_2025,
      ventas_2026: prev.ventas_2026 + row.ventas_2026,
    });
  }
  return Array.from(map.entries())
    .map(([name, vals]) => ({ name, ...vals }))
    .sort((a, b) => b.ventas_2025 - a.ventas_2025);
}

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: true }).format(v);

export default function SalesChart({ data, groupBy, title }: SalesChartProps) {
  const chartData = aggregate(data, groupBy);
  const isMobile = useIsMobile();

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
          <Bar dataKey="ventas_2024" name="2024" fill="hsl(210, 15%, 55%)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="ventas_2025" name="2025" fill="hsl(174, 100%, 29%)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="ventas_2026" name="2026" fill="hsl(174, 80%, 45%)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (!title) return chart;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{chart}</CardContent>
    </Card>
  );
}
