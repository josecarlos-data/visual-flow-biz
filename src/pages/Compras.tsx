import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Package, Truck, TrendingDown } from "lucide-react";

const kpis = [
  { label: "Compras del mes", value: "€ 124.580", icon: ShoppingCart, hint: "+8,2% vs. mes anterior" },
  { label: "Proveedores activos", value: "37", icon: Truck, hint: "3 nuevos este mes" },
  { label: "Pedidos en curso", value: "18", icon: Package, hint: "5 pendientes de entrega" },
  { label: "Ahorro estimado", value: "€ 6.420", icon: TrendingDown, hint: "negociación trimestral" },
];

const ultimasCompras = [
  { proveedor: "Suministros Ibérica S.L.", referencia: "PED-2026-00481", importe: "€ 12.340", fecha: "26/04/2026" },
  { proveedor: "MetalPro", referencia: "PED-2026-00480", importe: "€ 8.920", fecha: "25/04/2026" },
  { proveedor: "Logística Norte", referencia: "PED-2026-00479", importe: "€ 4.150", fecha: "24/04/2026" },
  { proveedor: "Componentes Sur", referencia: "PED-2026-00478", importe: "€ 21.700", fecha: "23/04/2026" },
];

export default function Compras() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
        <p className="text-muted-foreground">
          Resumen de compras (datos de ejemplo — se conectarán a la fuente real más adelante).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas compras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Proveedor</th>
                  <th className="py-2 pr-4 font-medium">Referencia</th>
                  <th className="py-2 pr-4 font-medium">Importe</th>
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ultimasCompras.map((c) => (
                  <tr key={c.referencia} className="border-b last:border-0">
                    <td className="py-2 pr-4">{c.proveedor}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{c.referencia}</td>
                    <td className="py-2 pr-4 font-medium">{c.importe}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{c.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
