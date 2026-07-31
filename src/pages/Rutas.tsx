import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Route as RouteIcon, MapPin, TrendingUp, TrendingDown, Minus, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRutas, eur, tendencia, fechaCorta } from "@/hooks/useCrm";

const ICONO = {
  sube: TrendingUp,
  baja: TrendingDown,
  estable: Minus,
  nuevo: TrendingUp,
} as const;

const COLOR = {
  sube: "text-emerald-600 dark:text-emerald-400",
  baja: "text-destructive",
  estable: "text-muted-foreground",
  nuevo: "text-emerald-600 dark:text-emerald-400",
} as const;

export default function Rutas() {
  const { data: rutas, isLoading, error } = useRutas();
  const [q, setQ] = useState("");

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rutas ?? [];
    return (rutas ?? []).filter((r) => r.ruta.toLowerCase().includes(term));
  }, [rutas, q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rutas</h1>
        <p className="text-sm text-muted-foreground">
          Tus rutas comerciales: qué clientes tocan, cómo van y a cuáles hace tiempo que no visitas
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ruta…" className="pl-9" />
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            No se han podido cargar las rutas: {(error as Error).message}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay rutas asignadas a tu cartera.
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{filtradas.length} rutas</p>
          <div className="space-y-2">
            {filtradas.map((r) => {
              const t = tendencia(r.importe_actual, r.importe_anterior_ytd);
              const Icono = ICONO[t];
              return (
                <Link
                  key={r.ruta}
                  to={`/rutas/${encodeURIComponent(r.ruta)}`}
                  className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <RouteIcon className="h-4 w-4 text-primary" />
                        {r.ruta}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{r.clientes} clientes</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.con_geo} con ubicación
                        </span>
                        {r.ultima_visita && <span>Última visita {fechaCorta(r.ultima_visita)}</span>}
                      </div>
                      {r.sin_visitar > 0 && (
                        <Badge variant="outline" className="mt-2 gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400">
                          <CalendarClock className="h-3 w-3" />
                          {r.sin_visitar} sin visitar hace +90 días
                        </Badge>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{eur(r.importe_actual)}</p>
                      <p className={`flex items-center justify-end gap-1 text-xs ${COLOR[t]}`}>
                        <Icono className="h-3 w-3" />
                        {eur(r.importe_anterior_ytd)} año ant.
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
