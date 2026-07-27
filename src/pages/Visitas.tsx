import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVisitas, useClientes, useMotivos, fechaCorta } from "@/hooks/useCrm";

export default function Visitas() {
  const { data: visitas, isLoading } = useVisitas();
  const { data: clientes } = useClientes();
  const { data: motivos } = useMotivos();
  const [q, setQ] = useState("");

  const nombreCliente = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of clientes ?? []) m.set(c.cod_cliente, c.cliente);
    return m;
  }, [clientes]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return visitas ?? [];
    return (visitas ?? []).filter((v) =>
      (nombreCliente.get(v.cod_cliente) ?? "").toLowerCase().includes(term),
    );
  }, [visitas, q, nombreCliente]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Visitas</h1>
          <p className="text-sm text-muted-foreground">Histórico de visitas registradas</p>
        </div>
        <Button asChild>
          <Link to="/visitas/nueva"><Plus className="mr-2 h-4 w-4" />Nueva</Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por cliente…" className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Todavía no hay visitas registradas.</p>
            <Button asChild variant="outline"><Link to="/visitas/nueva">Registrar la primera</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <Link key={v.id} to={`/clientes/${v.cod_cliente}`} className="block rounded-lg border bg-card p-4 hover:bg-accent">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{nombreCliente.get(v.cod_cliente) ?? `Cliente #${v.cod_cliente}`}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{fechaCorta(v.fecha)}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {motivos?.find((m) => m.key === v.motivo_key)?.nombre ?? "Visita"}
                </Badge>
              </div>
              {(v.observaciones || v.transcripcion) && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {v.observaciones || v.transcripcion}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
