import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useObjetivosSeguimiento, anioActual } from "@/hooks/useObjetivos";
import { ObjetivoCard } from "@/components/ObjetivoCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { etiquetaCorte } from "@/lib/projectionQuincenal";

export default function Objetivos() {
  const { role } = useAuth();
  const esDireccion = role === "admin" || role === "director_comercial" || role === "jefe_de_zona";
  const [anio, setAnio] = useState(anioActual());
  const [vendedorSel, setVendedorSel] = useState("todos");

  const { data, isLoading, error } = useObjetivosSeguimiento(anio);

  const vendedores = useMemo(
    () => Array.from(new Set((data ?? []).map((o) => o.vendedor))).sort(),
    [data]
  );

  const visibles = useMemo(
    () => (data ?? []).filter((o) => vendedorSel === "todos" || o.vendedor === vendedorSel),
    [data, vendedorSel]
  );

  const cartera = visibles.filter((o) => o.tipo === "cartera");
  const rutas = visibles.filter((o) => o.tipo === "ruta");
  const corte = data?.[0]?.quincena_corte ?? 0;

  const anios = [anioActual() + 1, anioActual(), anioActual() - 1];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Objetivos
          </h1>
          <p className="text-sm text-muted-foreground">
            Proyección quincenal · {etiquetaCorte(corte)}
          </p>
        </div>
        <div className="flex gap-2">
          {esDireccion && vendedores.length > 1 && (
            <Select value={vendedorSel} onValueChange={setVendedorSel}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los comerciales</SelectItem>
                {vendedores.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anios.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {error && (
        <Card><CardContent className="p-6 text-sm text-destructive">
          No se pudieron cargar los objetivos: {(error as Error).message}
        </CardContent></Card>
      )}

      {!isLoading && !error && visibles.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          Todavía no hay objetivos asignados para {anio}.
        </CardContent></Card>
      )}

      {cartera.map((o) => <ObjetivoCard key={o.id} objetivo={o} anio={anio} />)}

      {rutas.length > 0 && (
        <div className="space-y-4">
          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Objetivos particulares por ruta especial
          </h2>
          {rutas.map((o) => <ObjetivoCard key={o.id} objetivo={o} anio={anio} />)}
        </div>
      )}
    </div>
  );
}
