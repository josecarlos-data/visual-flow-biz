import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";
import { useMemo, useState } from "react";
import { Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClientSparklines from "./ClientSparklines";

interface MonthlyComparisonChartProps {
  data: ClienteConVentas[];
  selectedYears: number[];
  monthRange: [number, number];
}

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const YEAR_COLORS: Record<number, string> = {
  2024: "hsl(210, 15%, 55%)",
  2025: "hsl(174, 100%, 29%)",
  2026: "hsl(174, 80%, 45%)",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

export default function MonthlyComparisonChart({ data, selectedYears, monthRange }: MonthlyComparisonChartProps) {
  const isMobile = useIsMobile();
  const [showClientView, setShowClientView] = useState(false);

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          {showClientView ? "Evolución Mensual por Cliente" : "Comparativa Mensual por Año"}
        </CardTitle>
        <Button
          variant={showClientView ? "default" : "outline"}
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setShowClientView((v) => !v)}
        >
          {showClientView ? <BarChart3 className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
          {showClientView ? "Por año" : "Top 10"}
        </Button>
      </CardHeader>
      <CardContent>
        {showClientView ? (
          <ClientSparklines data={data} />
        ) : (
          <div className="h-[280px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: isMobile ? 10 : 20, left: isMobile ? 0 : 10, bottom: 5 }}>
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
                    stroke={YEAR_COLORS[year] || "hsl(0, 0%, 50%)"}
                    strokeWidth={2}
                    dot={{ r: isMobile ? 2 : 3 }}
                    activeDot={{ r: isMobile ? 4 : 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
