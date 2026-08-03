import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Target, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { eur, pct } from "@/lib/format";
import { calcularProyeccionQuincenal, etiquetaCorte } from "@/lib/projectionQuincenal";
import { anioActual, useObjetivosSeguimiento } from "@/hooks/useObjetivos";

/** Resumen compacto de objetivos para el panel de Ventas. */
export function ResumenObjetivos() {
  const anio = anioActual();
  const { data } = useObjetivosSeguimiento(anio);

  const filas = useMemo(
    () =>
      (data ?? [])
        .filter((o) => o.activo)
        .map((o) => {
          const actual = o.series.filter((s) => s.anio === anio).map((s) => ({ q: s.q, valor: s.importe }));
          const previo = o.series.filter((s) => s.anio === anio - 1).map((s) => ({ q: s.q, valor: s.importe }));
          const calc = calcularProyeccionQuincenal(actual, previo, o.quincena_corte);
          return {
            id: o.id,
            titulo: o.tipo === "cartera" ? `Cartera · ${o.vendedor}` : `Ruta ${o.ruta} · ${o.vendedor}`,
            objetivo: o.importe_objetivo,
            vendido: calc.vendidoTotal,
            proyeccion: calc.proyeccion,
            corte: o.quincena_corte,
          };
        })
        .slice(0, 4),
    [data, anio]
  );

  if (filas.length === 0) return null;
  const corte = filas[0].corte;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" />
            Objetivos {anio}
            <span className="font-normal text-muted-foreground">· {etiquetaCorte(corte)}</span>
          </div>
          <Link to="/objetivos" className="flex items-center text-sm text-primary hover:underline">
            Ver detalle <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filas.map((f) => {
            const logrado = f.objetivo > 0 ? (f.vendido / f.objetivo) * 100 : 0;
            const cierre = f.objetivo > 0 ? (f.proyeccion / f.objetivo) * 100 : 0;
            return (
              <div key={f.id} className="rounded-md border p-3">
                <p className="truncate text-xs text-muted-foreground">{f.titulo}</p>
                <p className="text-sm font-semibold">{eur(f.vendido)} / {eur(f.objetivo)}</p>
                <Progress className="my-2 h-1.5" value={Math.min(100, Math.max(0, logrado))} />
                <p className="text-[11px] text-muted-foreground">
                  {pct(logrado)} logrado · proyección {pct(cierre)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
