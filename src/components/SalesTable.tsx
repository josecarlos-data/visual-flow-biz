import { useState, useMemo } from "react";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClienteConVentas } from "@/hooks/useHistoricoData";

interface SalesTableProps {
  data: ClienteConVentas[];
  hideVendedor?: boolean;
}

type SortKey = "cliente" | "vendedor" | "ventas_2024" | "ventas_2025" | "ventas_2026" | "proyeccion_2026" | "delegacion";

const fmt = (v: number | null) =>
  v != null
    ? new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(v) + " €"
    : "—";

const pct = (v: number | null) =>
  v != null ? `${(Number(v) * 100).toFixed(1)}%` : "—";

export default function SalesTable({ data }: SalesTableProps) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("ventas_2025");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ClienteConVentas | null>(null);
  const isMobile = useIsMobile();

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
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <SortHeader label="Cliente" k="cliente" />
                    {!showSearch ? (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowSearch(true)}>
                        <Search className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="Buscar..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="h-6 w-28 text-xs px-1.5"
                          autoFocus
                        />
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setShowSearch(false); setSearch(""); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell"><SortHeader label="Vendedor" k="vendedor" /></TableHead>
                <TableHead className="hidden md:table-cell"><SortHeader label="Delegación" k="delegacion" /></TableHead>
                <TableHead className="text-right hidden sm:table-cell"><SortHeader label="2024" k="ventas_2024" /></TableHead>
                <TableHead className="text-right"><SortHeader label="2025" k="ventas_2025" /></TableHead>
                <TableHead className="text-right"><SortHeader label="2026" k="ventas_2026" /></TableHead>
                <TableHead className="text-right hidden lg:table-cell"><SortHeader label="Proyección" k="proyeccion_2026" /></TableHead>
                <TableHead className="text-right hidden lg:table-cell">Crecimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((r) => (
                <TableRow
                  key={r.cod_cliente}
                  className={isMobile ? "cursor-pointer hover:bg-accent/50" : ""}
                  onClick={() => isMobile && setSelectedRow(r)}
                >
                  <TableCell className="font-medium max-w-[120px] sm:max-w-[200px] truncate">{r.cliente}</TableCell>
                  <TableCell className="hidden md:table-cell">{r.vendedor || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{r.delegacion || "—"}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">{fmt(r.ventas_2024)}</TableCell>
                  <TableCell className="text-right">{fmt(r.ventas_2025)}</TableCell>
                  <TableCell className="text-right">{fmt(r.ventas_2026)}</TableCell>
                  <TableCell className="text-right hidden lg:table-cell">{fmt(r.proyeccion_2026)}</TableCell>
                  <TableCell className="text-right hidden lg:table-cell">{pct(r.crecimiento_previsto)}</TableCell>
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

      {/* Mobile row detail dialog */}
      <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm leading-tight">{selectedRow?.cliente}</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Ventas 2026</span><span className="font-medium">{fmt(selectedRow.ventas_2026)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ventas 2025</span><span className="font-medium">{fmt(selectedRow.ventas_2025)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ventas 2024</span><span className="font-medium">{fmt(selectedRow.ventas_2024)}</span></div>
              {selectedRow.vendedor && <div className="flex justify-between"><span className="text-muted-foreground">Vendedor</span><span>{selectedRow.vendedor}</span></div>}
              {selectedRow.delegacion && <div className="flex justify-between"><span className="text-muted-foreground">Delegación</span><span>{selectedRow.delegacion}</span></div>}
              {selectedRow.proyeccion_2026 != null && <div className="flex justify-between"><span className="text-muted-foreground">Proyección</span><span>{fmt(selectedRow.proyeccion_2026)}</span></div>}
              {selectedRow.crecimiento_previsto != null && <div className="flex justify-between"><span className="text-muted-foreground">Crecimiento</span><span>{pct(selectedRow.crecimiento_previsto)}</span></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
