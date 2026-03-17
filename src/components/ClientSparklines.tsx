import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const COLOR_CURRENT = "hsl(174, 100%, 29%)";
const COLOR_PREV = "hsl(210, 15%, 55%)";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

interface ClientSparklinesProps {
  data: ClienteConVentas[];
}

interface SparkData {
  name: string;
  mes: string;
  current: number;
  prev: number;
}

export default function ClientSparklines({ data }: ClientSparklinesProps) {
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  const topClients = useMemo(() => {
    // Aggregate total sales for current + previous year per client
    const clientTotals = new Map<number, { name: string; total: number }>();

    for (const row of data) {
      let total = 0;
      for (const vm of row.ventas_mensuales) {
        if (vm.anio === currentYear || vm.anio === prevYear) {
          total += vm.valor;
        }
      }
      const existing = clientTotals.get(row.cod_cliente);
      if (existing) {
        existing.total += total;
      } else {
        clientTotals.set(row.cod_cliente, { name: row.cliente, total });
      }
    }

    return Array.from(clientTotals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([cod, info]) => ({ cod_cliente: cod, cliente: info.name }));
  }, [data, currentYear, prevYear]);

  const sparklineData = useMemo(() => {
    const result = new Map<number, SparkData[]>();

    for (const client of topClients) {
      const months: SparkData[] = Array.from({ length: 12 }, (_, i) => ({
        name: client.cliente,
        mes: MONTH_NAMES[i],
        current: 0,
        prev: 0,
      }));
      result.set(client.cod_cliente, months);
    }

    for (const row of data) {
      const months = result.get(row.cod_cliente);
      if (!months) continue;
      for (const vm of row.ventas_mensuales) {
        if (vm.mes < 1 || vm.mes > 12) continue;
        if (vm.anio === currentYear) {
          months[vm.mes - 1].current += vm.valor;
        } else if (vm.anio === prevYear) {
          months[vm.mes - 1].prev += vm.valor;
        }
      }
    }

    return result;
  }, [data, topClients, currentYear, prevYear]);

  const clientTotals = useMemo(() => {
    const totals = new Map<number, { current: number; prev: number }>();
    for (const [cod, months] of sparklineData) {
      let current = 0, prev = 0;
      for (const m of months) {
        current += m.current;
        prev += m.prev;
      }
      totals.set(cod, { current, prev });
    }
    return totals;
  }, [sparklineData]);

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 rounded" style={{ background: COLOR_CURRENT }} />
          {currentYear}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-5 h-0.5 rounded"
            style={{ background: COLOR_PREV, borderTop: "2px dashed", borderColor: COLOR_PREV }}
          />
          {prevYear}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {topClients.map((client) => {
          const months = sparklineData.get(client.cod_cliente) || [];
          const totals = clientTotals.get(client.cod_cliente);
          const change = totals && totals.prev > 0
            ? ((totals.current - totals.prev) / totals.prev) * 100
            : null;

          return (
            <div
              key={client.cod_cliente}
              className="rounded-lg border border-border bg-card p-2 flex flex-col"
            >
              <p className="text-[10px] font-medium text-foreground truncate leading-tight mb-1" title={client.cliente}>
                {client.cliente}
              </p>
              <div className="h-[60px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={months} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Tooltip
                      contentStyle={{ fontSize: 11, padding: "4px 8px" }}
                      formatter={(value: number, name: string) => [
                        fmt(value),
                        name === "current" ? String(currentYear) : String(prevYear),
                      ]}
                      labelFormatter={(label) => label}
                    />
                    <Line
                      type="monotone"
                      dataKey="prev"
                      stroke={COLOR_PREV}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      activeDot={{ r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="current"
                      stroke={COLOR_CURRENT}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-baseline justify-between mt-1 gap-1">
                <span className="text-[9px] text-muted-foreground">
                  {fmt(totals?.current ?? 0)}
                </span>
                {change !== null && (
                  <span
                    className={`text-[9px] font-semibold ${change >= 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {change >= 0 ? "+" : ""}{change.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
