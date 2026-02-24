import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database as DbIcon } from "lucide-react";

export default function AdminData() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Datos</h1>
        <p className="text-muted-foreground">Carga y gestiona las tablas de datos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DbIcon className="h-5 w-5" />
            Tablas de datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Las tablas de datos se mostrarán aquí una vez que se defina la estructura de la base de datos de ventas.
            Sube tu archivo con la estructura para continuar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
