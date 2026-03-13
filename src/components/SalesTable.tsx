import { useState, useMemo } from "react";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";

interface SalesTableProps {
  data: ClienteConVentas[];
}

type SortKey = "cliente" | "vendedor" | "ventas_2024" | "ventas_2025" | "ventas_2026" | "proyeccion_2026" | "delegacion";

const fmt = (v: number | null) =>
  v != null
    ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)
    : "—";

const pct = (v: number | null) =>
  v != null ? `${(Number(v) * 100).toFixed(1)}%` : "—";

export default function SalesTable({ data }: SalesTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ventas_2025");
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = data.filter(
      (r) => r.cliente.toLowerCase().includes(q) || (r.vendedor ?? "").toLowerCase().includes(q) || (r.delegacion ?? "").toLowerCase().includes(q)
    );
    rows.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string") return sortAsc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
      return sortAsc ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return rows;
  }, [data, search, sortKey, sortAsc]);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium" onClick={() => toggleSort(k)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Tabla de Clientes</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortHeader label="Cliente" k="cliente" /></TableHead>
                <TableHead className="hidden md:table-cell"><SortHeader label="Vendedor" k="vendedor" /></TableHead>
                <TableHead className="hidden md:table-cell"><SortHeader label="Delegación" k="delegacion" /></TableHead>
                <TableHead className="text-right"><SortHeader label="2024" k="ventas_2024" /></TableHead>
                <TableHead className="text-right"><SortHeader label="2025" k="ventas_2025" /></TableHead>
                <TableHead className="text-right"><SortHeader label="2026" k="ventas_2026" /></TableHead>
                <TableHead className="text-right"><SortHeader label="Proyección" k="proyeccion_2026" /></TableHead>
                <TableHead className="text-right">Crecimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((r) => (
                <TableRow key={r.cod_cliente}>
                  <TableCell className="font-medium max-w-[200px] truncate">{r.cliente}</TableCell>
                  <TableCell>{r.vendedor || "—"}</TableCell>
                  <TableCell>{r.delegacion || "—"}</TableCell>
                  <TableCell className="text-right">{fmt(r.ventas_2024)}</TableCell>
                  <TableCell className="text-right">{fmt(r.ventas_2025)}</TableCell>
                  <TableCell className="text-right">{fmt(r.ventas_2026)}</TableCell>
                  <TableCell className="text-right">{fmt(r.proyeccion_2026)}</TableCell>
                  <TableCell className="text-right">{pct(r.crecimiento_previsto)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sin resultados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 100 && (
          <p className="text-xs text-muted-foreground p-3">Mostrando 100 de {filtered.length} registros</p>
        )}
      </CardContent>
    </Card>
  );
}
