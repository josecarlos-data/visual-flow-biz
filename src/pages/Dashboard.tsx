import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Target, DollarSign, BarChart3 } from "lucide-react";
import { useHistoricoData, useVendedores, useDelegaciones } from "@/hooks/useHistoricoData";
import DelegacionFilter from "@/components/DelegacionFilter";
import SalesChart from "@/components/SalesChart";
import TopClientsChart from "@/components/TopClientsChart";
import SalesTable from "@/components/SalesTable";
import MonthlyComparisonChart from "@/components/MonthlyComparisonChart";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

const AVAILABLE_YEARS = [2024, 2025, 2026];

export default function Dashboard() {
  const { role, employeeCode, delegacion: userDelegacion } = useAuth();
  const [selectedVendedores, setSelectedVendedores] = useState<string[]>([]);
  const [selectedDelegaciones, setSelectedDelegaciones] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([2024, 2025, 2026]);
  const [monthStart, setMonthStart] = useState(1);
  const [monthEnd, setMonthEnd] = useState(12);

  // Role-based auto-filtering
  const userVendedor = role === "comercial" ? employeeCode : null;
  const userDelegacionFilter = role === "jefe_de_zona" ? userDelegacion : null;

  const { data: allData, isLoading } = useHistoricoData({
    vendedores: selectedVendedores.length > 0 ? selectedVendedores : undefined,
    delegaciones: selectedDelegaciones.length > 0 ? selectedDelegaciones : undefined,
    userVendedor,
    userDelegacion: userDelegacionFilter,
  });
  const { data: vendedoresList } = useVendedores();
  const { data: delegacionesList } = useDelegaciones();

  const showFilter = role === "admin" || role === "director_comercial";
  const rows = allData ?? [];

  const kpis = useMemo(() => {
    if (rows.length === 0) return null;
    const totalVentas2025 = rows.reduce((s, r) => s + r.ventas_2025, 0);
    const totalProyeccion = rows.reduce((s, r) => s + (Number(r.proyeccion_2026) || 0), 0);
    const totalVentas2024 = rows.reduce((s, r) => s + r.ventas_2024, 0);
    const crecimiento = totalVentas2024 > 0 ? ((totalVentas2025 - totalVentas2024) / totalVentas2024) * 100 : 0;
    const clientesActivos = rows.filter((r) => r.ventas_2025 > 0).length;

    return { totalVentas2025, totalProyeccion, crecimiento, clientesActivos };
  }, [rows]);

  const toggleVendedor = (v: string) => {
    setSelectedVendedores((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort()
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {role === "admin" || role === "director_comercial"
            ? "Vista general de todas las ventas"
            : role === "jefe_de_zona"
            ? "Ventas de tu zona"
            : "Tus ventas"}
        </p>
      </div>

      {/* Filters */}
      {showFilter && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Filtros
              {(selectedVendedores.length > 0 || selectedDelegaciones.length > 0) && (
                <Badge variant="secondary">
                  {selectedVendedores.length + selectedDelegaciones.length} activos
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendedoresList && vendedoresList.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Vendedores</p>
                <div className="flex flex-wrap gap-2">
                  {vendedoresList.map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent data-[checked=true]:bg-accent"
                      data-checked={selectedVendedores.includes(v)}
                    >
                      <Checkbox
                        checked={selectedVendedores.includes(v)}
                        onCheckedChange={() => toggleVendedor(v)}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {delegacionesList && delegacionesList.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Delegaciones</p>
                <DelegacionFilter
                  delegaciones={delegacionesList}
                  selected={selectedDelegaciones}
                  onChange={setSelectedDelegaciones}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Year & Month filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-sm font-medium mb-2">Años</p>
              <div className="flex gap-2">
                {AVAILABLE_YEARS.map((year) => (
                  <label
                    key={year}
                    className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent data-[checked=true]:bg-accent"
                    data-checked={selectedYears.includes(year)}
                  >
                    <Checkbox
                      checked={selectedYears.includes(year)}
                      onCheckedChange={() => toggleYear(year)}
                    />
                    <span>{year}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Mes inicio</p>
                <Select value={String(monthStart)} onValueChange={(v) => setMonthStart(Number(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][m - 1]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Mes fin</p>
                <Select value={String(monthEnd)} onValueChange={(v) => setMonthEnd(Number(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][m - 1]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas 2025</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(kpis.totalVentas2025)}</div>
              <p className="text-xs text-muted-foreground">{rows.length} clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proyección 2026</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(kpis.totalProyeccion)}</div>
              <p className="text-xs text-muted-foreground">Estimación anual</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.clientesActivos}</div>
              <p className="text-xs text-muted-foreground">Con ventas en 2025</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Crecimiento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpis.crecimiento >= 0 ? "text-primary" : "text-destructive"}`}>
                {kpis.crecimiento >= 0 ? "+" : ""}{kpis.crecimiento.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">2024 vs 2025</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Sin datos. Carga los datos de ventas desde Administración → Datos.</p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {rows.length > 0 && (
        <>
          <MonthlyComparisonChart
            data={rows}
            selectedYears={selectedYears}
            monthRange={[monthStart, monthEnd]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <SalesChart data={rows} groupBy="vendedor" title="Ventas por Vendedor" />
            <SalesChart data={rows} groupBy="delegacion" title="Ventas por Delegación" />
          </div>

          <TopClientsChart data={rows} />

          <SalesTable data={rows} />
        </>
      )}
    </div>
  );
}
