import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";

interface TopClientsChartProps {
  data: ClienteConVentas[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

export default function TopClientsChart({ data }: TopClientsChartProps) {
  const isMobile = useIsMobile();
  const maxLen = isMobile ? 10 : 25;
  const truncLen = isMobile ? 8 : 22;

  const top = [...data]
    .sort((a, b) => b.ventas_2025 - a.ventas_2025)
    .slice(0, 10)
    .map((r) => ({
      name: r.cliente.length > maxLen ? r.cliente.slice(0, truncLen) + "..." : r.cliente,
      ventas_2025: r.ventas_2025,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top 10 Clientes (2025)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 5, right: 10, left: isMobile ? 60 : 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: isMobile ? 9 : 11 }} className="fill-muted-foreground" width={isMobile ? 55 : 95} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="ventas_2025" name="Ventas 2025" fill="hsl(174, 100%, 29%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
