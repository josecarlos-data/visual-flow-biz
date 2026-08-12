import { useMemo, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RejectionRow } from "@/lib/datasets";

interface Props {
  rechazos: RejectionRow[];
  /** Columnas originales del fichero, en orden. */
  columnas: string[];
  fileName?: string;
}

const escapar = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Detalle consultable y descargable de las filas rechazadas por validación. */
export default function RechazosImportacion({ rechazos, columnas, fileName }: Props) {
  const [abierto, setAbierto] = useState(false);

  const grupos = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rechazos) m.set(r.motivo, (m.get(r.motivo) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rechazos]);

  if (!rechazos.length) return null;

  const descargar = () => {
    const cabecera = [...columnas, "motivo_rechazo", "fila"];
    const lineas = [cabecera.join(";")];
    for (const r of rechazos) {
      lineas.push([...columnas.map((c) => escapar(r.row?.[c])), escapar(r.motivo), r.fila].join(";"));
    }
    const blob = new Blob(["\uFEFF" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rechazos-${(fileName || "importacion").replace(/\.[^.]+$/, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4" />
          {rechazos.length} fila{rechazos.length === 1 ? "" : "s"} rechazada{rechazos.length === 1 ? "" : "s"}
        </span>
        <Button variant="outline" size="sm" onClick={descargar}>
          <Download className="mr-1 h-3.5 w-3.5" /> Descargar rechazos en CSV
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAbierto((v) => !v)}>
          {abierto ? <ChevronDown className="mr-1 h-3.5 w-3.5" /> : <ChevronRight className="mr-1 h-3.5 w-3.5" />}
          {abierto ? "Ocultar detalle" : "Ver detalle"}
        </Button>
      </div>

      <ul className="space-y-1 text-xs">
        {grupos.map(([motivo, n]) => (
          <li key={motivo}>
            <span className="font-semibold">{n} ×</span> <span className="text-muted-foreground">{motivo}</span>
          </li>
        ))}
      </ul>

      {abierto && (
        <div className="max-h-[360px] overflow-auto rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Fila</TableHead>
                <TableHead className="min-w-[220px]">Motivo</TableHead>
                {columnas.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rechazos.map((r, i) => (
                <TableRow key={`${r.fila}-${i}`}>
                  <TableCell className="tabular-nums">{r.fila}</TableCell>
                  <TableCell className="text-destructive">{r.motivo}</TableCell>
                  {columnas.map((c) => (
                    <TableCell key={c} className="max-w-[220px] truncate">
                      {r.row?.[c] != null && String(r.row[c]) !== "" ? String(r.row[c]) : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
