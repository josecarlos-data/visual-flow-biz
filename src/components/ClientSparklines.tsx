import { useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";
import { getYearColor } from "@/lib/yearColors";
import { calcularProyeccion } from "@/lib/projection";
import { Checkbox } from "@/components/ui/checkbox";

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: true }).format(v);

interface ClientSparklinesProps {
  data: ClienteConVentas[];
  selectedYears: number[];
  monthRange: [number, number];
  cumulative?: boolean;
  showProjection?: boolean;
}

export default function ClientSparklines({ data, selectedYears, monthRange, cumulative = false, showProjection = false }: ClientSparklinesProps) {
  const [activeYears, setActiveYears] = useState<number[]>(selectedYears);

  // Sync when parent selectedYears changes
  useMemo(() => {
    setActiveYears((prev) => prev.filter((y) => selectedYears.includes(y)));
  }, [selectedYears]);

  const latestYear = Math.max(...selectedYears);

  const toggleYear = (year: number) => {
    setActiveYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort()
    );
  };

  const topClients = useMemo(() => {
    const clientTotals = new Map<number, { name: string; total: number }>();
    for (const row of data) {
      let total = 0;
      for (const vm of row.ventas_mensuales) {
        if (activeYears.includes(vm.anio) && vm.mes >= monthRange[0] && vm.mes <= monthRange[1]) {
          total += vm.valor;
        }
      }
      const existing = clientTotals.get(row.cod_cliente);
      if (existing) existing.total += total;
      else clientTotals.set(row.cod_cliente, { name: row.cliente, total });
    }
    return Array.from(clientTotals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([cod, info]) => ({ cod_cliente: cod, cliente: info.name }));
  }, [data, activeYears, monthRange]);

  // Build per-client sparkline data with all active years
  const sparklineData = useMemo(() => {
    const result = new Map<number, Record<string, number>[]>();
    const months: number[] = [];
    for (let m = monthRange[0]; m <= monthRange[1]; m++) months.push(m);

    for (const client of topClients) {
      const sparkMonths = months.map((m) => {
        const entry: Record<string, number> = { mesNum: m };
        for (const y of activeYears) entry[`y_${y}`] = 0;
        return entry;
      });
      result.set(client.cod_cliente, sparkMonths);
    }

    for (const row of data) {
      const sparkMonths = result.get(row.cod_cliente);
      if (!sparkMonths) continue;
      for (const vm of row.ventas_mensuales) {
        if (!activeYears.includes(vm.anio)) continue;
        if (vm.mes < monthRange[0] || vm.mes > monthRange[1]) continue;
        const idx = vm.mes - monthRange[0];
        sparkMonths[idx][`y_${vm.anio}`] = (sparkMonths[idx][`y_${vm.anio}`] || 0) + vm.valor;
      }
    }

    // Projection for latest year per client
    if (showProjection && activeYears.includes(latestYear)) {
      const prevYear = latestYear - 1;
      for (const client of topClients) {
        const clientRows = data.filter((r) => r.cod_cliente === client.cod_cliente);
        const ventasActual: { mes: number; valor: number }[] = [];
        const ventasPrevio: { mes: number; valor: number }[] = [];
        for (const row of clientRows) {
          for (const vm of row.ventas_mensuales) {
            if (vm.anio === latestYear) ventasActual.push({ mes: vm.mes, valor: vm.valor });
            if (vm.anio === prevYear) ventasPrevio.push({ mes: vm.mes, valor: vm.valor });
          }
        }
        const proj = calcularProyeccion(ventasActual, ventasPrevio);
        const sparkMonths = result.get(client.cod_cliente);
        if (sparkMonths) {
          for (const p of proj) {
            if (p.mes < monthRange[0] || p.mes > monthRange[1]) continue;
            const idx = p.mes - monthRange[0];
            sparkMonths[idx][`proy_${latestYear}`] = p.valor;
          }
        }
      }
    }

    // Cumulative transform
    if (cumulative) {
      for (const [, sparkMonths] of result) {
        const accumulators: Record<string, number> = {};
        for (const entry of sparkMonths) {
          for (const y of activeYears) {
            const key = `y_${y}`;
            accumulators[key] = (accumulators[key] || 0) + (entry[key] || 0);
            entry[key] = accumulators[key];
          }
          if (showProjection) {
            const projKey = `proy_${latestYear}`;
            accumulators[projKey] = (accumulators[projKey] || 0) + (entry[projKey] || 0);
            entry[projKey] = accumulators[projKey];
          }
        }
      }
    }

    return result;
  }, [data, topClients, activeYears, monthRange, cumulative, showProjection, latestYear]);

  const clientTotals = useMemo(() => {
    const totals = new Map<number, Record<string, number>>();
    for (const [cod, months] of sparklineData) {
      const t: Record<string, number> = {};
      for (const y of activeYears) {
        t[`y_${y}`] = cumulative
          ? months[months.length - 1]?.[`y_${y}`] || 0
          : months.reduce((s, m) => s + (m[`y_${y}`] || 0), 0);
      }
      totals.set(cod, t);
    }
    return totals;
  }, [sparklineData, activeYears, cumulative]);

  return (
    <div className="space-y-3">
      {/* Year selector + Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground px-1 flex-wrap">
        {selectedYears.map((year) => (
          <label key={year} className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={activeYears.includes(year)}
              onCheckedChange={() => toggleYear(year)}
              className="h-3 w-3"
            />
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{ background: getYearColor(year, latestYear) }}
            />
            <span>{year}</span>
          </label>
        ))}
        {showProjection && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{ background: getYearColor(latestYear, latestYear), opacity: 0.6, borderTop: "1px dashed" }}
            />
            Proy. {latestYear}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {topClients.map((client) => {
          const months = sparklineData.get(client.cod_cliente) || [];
          const totals = clientTotals.get(client.cod_cliente);
          const currentTotal = totals?.[`y_${latestYear}`] || 0;
          const prevYear = Math.max(...activeYears.filter((y) => y < latestYear), latestYear - 1);
          const prevTotal = totals?.[`y_${prevYear}`] || 0;
          const change = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : null;

          return (
            <div key={client.cod_cliente} className="rounded-lg border border-border bg-card p-2 flex flex-col">
              <p className="text-[10px] font-medium text-foreground truncate leading-tight mb-1" title={client.cliente}>
                {client.cliente}
              </p>
              <div className="h-[60px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={months} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Tooltip
                      contentStyle={{ fontSize: 11, padding: "4px 8px" }}
                      formatter={(value: number, name: string) => {
                        const yearMatch = name.match(/\d+/);
                        return [fmt(value), yearMatch ? yearMatch[0] : name];
                      }}
                      labelFormatter={(_label, payload) => {
                        const m = payload?.[0]?.payload?.mesNum;
                        return m ? MONTH_NAMES[m - 1] : "";
                      }}
                    />
                    {activeYears.map((year) => (
                      <Line
                        key={year}
                        type="monotone"
                        dataKey={`y_${year}`}
                        stroke={getYearColor(year, latestYear)}
                        strokeWidth={year === latestYear ? 2 : 1.5}
                        strokeDasharray={year === latestYear ? undefined : "4 3"}
                        dot={false}
                        activeDot={{ r: 2 }}
                      />
                    ))}
                    {showProjection && activeYears.includes(latestYear) && (
                      <Line
                        type="monotone"
                        dataKey={`proy_${latestYear}`}
                        stroke={getYearColor(latestYear, latestYear)}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                        activeDot={{ r: 2 }}
                        opacity={0.6}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-baseline justify-between mt-1 gap-1">
                <span className="text-[9px] text-muted-foreground">{fmt(currentTotal)}</span>
                {change !== null && (
                  <span className={`text-[9px] font-semibold ${change >= 0 ? "text-primary" : "text-destructive"}`}>
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
