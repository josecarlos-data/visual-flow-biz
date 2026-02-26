import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Target, DollarSign } from "lucide-react";
import ComercialFilter from "@/components/ComercialFilter";

const kpis = [
  { title: "Ventas Totales", value: "—", icon: DollarSign, change: "" },
  { title: "Objetivo", value: "—", icon: Target, change: "" },
  { title: "Comerciales", value: "—", icon: Users, change: "" },
  { title: "Crecimiento", value: "—", icon: TrendingUp, change: "" },
];

export default function Dashboard() {
  const { role } = useAuth();
  const [selectedComerciales, setSelectedComerciales] = useState<string[]>([]);

  const showFilter = role === "admin" || role === "director_comercial";

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

      {showFilter && (
        <ComercialFilter
          selectedIds={selectedComerciales}
          onSelectionChange={setSelectedComerciales}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.change || "Sin datos aún"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {selectedComerciales.length > 0
              ? `Mostrando datos para ${selectedComerciales.length} comercial(es) seleccionado(s). Los datos se mostrarán cuando se cargue la estructura de ventas.`
              : "Los datos se mostrarán cuando el administrador cargue la estructura de ventas."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
