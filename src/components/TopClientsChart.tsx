import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";

interface TopClientsChartProps {
  data: ClienteConVentas[];
}

const YEAR_COLORS: Record<number, string> = {
  2024: "hsl(210, 15%, 55%)",
  2025: "hsl(174, 100%, 29%)",
  2026: "hsl(30, 90%, 50%)",
};

const AVAILABLE_YEARS = [2024, 2025, 2026];

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

export default function TopClientsChart({ data }: TopClientsChartProps) {
  const isMobile = useIsMobile();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const maxLen = isMobile ? 10 : 25;
  const truncLen = isMobile ? 8 : 22;

  const yearKey = `ventas_${selectedYear}` as keyof ClienteConVentas;

  const top = [...data]
    .sort((a, b) => (Number(b[yearKey]) || 0) - (Number(a[yearKey]) || 0))
    .slice(0, 10)
    .map((r) => ({
      name: r.cliente.length > maxLen ? r.cliente.slice(0, truncLen) + "..." : r.cliente,
      value: Number(r[yearKey]) || 0,
    }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Top 10 Clientes ({selectedYear})</CardTitle>
        <ToggleGroup
          type="single"
          value={String(selectedYear)}
          onValueChange={(v) => v && setSelectedYear(Number(v))}
          size="sm"
        >
          {AVAILABLE_YEARS.map((y) => (
            <ToggleGroupItem
              key={y}
              value={String(y)}
              className="text-xs px-2.5 h-7 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              {y}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 5, right: 10, left: isMobile ? 5 : 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: isMobile ? 8 : 11 }} className="fill-muted-foreground" width={isMobile ? 50 : 95} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="value" name={`Ventas ${selectedYear}`} fill={YEAR_COLORS[selectedYear]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
