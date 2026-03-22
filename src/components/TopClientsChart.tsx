import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";
import { getYearColor } from "@/lib/yearColors";

interface TopClientsChartProps {
  data: ClienteConVentas[];
}

const AVAILABLE_YEARS = [2024, 2025, 2026];

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: true }).format(v);

export default function TopClientsChart({ data }: TopClientsChartProps) {
  const isMobile = useIsMobile();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedClient, setSelectedClient] = useState<ClienteConVentas | null>(null);
  const maxLen = isMobile ? 12 : 35;
  const truncLen = isMobile ? 10 : 32;
  const latestYear = Math.max(...AVAILABLE_YEARS);

  const yearKey = `ventas_${selectedYear}` as keyof ClienteConVentas;

  const topData = [...data]
    .sort((a, b) => (Number(b[yearKey]) || 0) - (Number(a[yearKey]) || 0))
    .slice(0, 10);

  const top = topData.map((r) => ({
    name: r.cliente.length > maxLen ? r.cliente.slice(0, truncLen) + "..." : r.cliente,
    fullName: r.cliente,
    value: Number(r[yearKey]) || 0,
    cod_cliente: r.cod_cliente,
  }));

  const handleBarClick = (barData: any) => {
    if (!isMobile) return;
    const client = data.find((r) => r.cod_cliente === barData?.cod_cliente);
    if (client) setSelectedClient(client);
  };

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
        <div className="h-[340px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={top}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
              onClick={(state) => {
                if (state?.activePayload?.[0]?.payload) {
                  handleBarClick(state.activePayload[0].payload);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: isMobile ? 9 : 12 }} className="fill-muted-foreground" width={isMobile ? 60 : 140} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Bar dataKey="value" name={`Ventas ${selectedYear}`} fill={getYearColor(selectedYear, latestYear)} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>

      {/* Mobile detail dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm leading-tight">{selectedClient?.cliente}</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Ventas 2026</span><span className="font-medium">{fmt(selectedClient.ventas_2026)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ventas 2025</span><span className="font-medium">{fmt(selectedClient.ventas_2025)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ventas 2024</span><span className="font-medium">{fmt(selectedClient.ventas_2024)}</span></div>
              {selectedClient.vendedor && <div className="flex justify-between"><span className="text-muted-foreground">Vendedor</span><span>{selectedClient.vendedor}</span></div>}
              {selectedClient.delegacion && <div className="flex justify-between"><span className="text-muted-foreground">Delegación</span><span>{selectedClient.delegacion}</span></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
