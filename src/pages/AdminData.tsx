import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Database as DbIcon, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ParsedRow {
  cod_cliente: number;
  cliente: string;
  vendedor: string;
  ventas_2024: number | null;
  ventas_2025: number | null;
  peso_25: number | null;
  enero_2026: number | null;
  febrero_2026: number | null;
  ventas_2026: number | null;
  peso_26: number | null;
  proyeccion_2026: number | null;
  crecimiento_previsto: number | null;
  margen_pct: number | null;
  top_truck: string | null;
  delegacion: string | null;
  comercial_code: string | null;
}

// Map Excel column names to our DB fields
const COL_MAP: Record<string, keyof ParsedRow> = {
  "COD.CLIENTE": "cod_cliente",
  "CLIENTE": "cliente",
  "VENDEDOR": "vendedor",
  "VENTAS 2024": "ventas_2024",
  "VENTAS 2025": "ventas_2025",
  "PESO 25": "peso_25",
  "ENERO 2026": "enero_2026",
  "FEBRERO 2026": "febrero_2026",
  "VENTAS 2026": "ventas_2026",
  "PESO 26": "peso_26",
  "PROYECCIÓN 2026": "proyeccion_2026",
  "PROYECCION 2026": "proyeccion_2026",
  "CRECIMIENTO PREVISTO": "crecimiento_previsto",
  "% MARGEN": "margen_pct",
  "TOP TRUCK": "top_truck",
  "DELEGACIÓN": "delegacion",
  "DELEGACION": "delegacion",
  "GSmart.COMERCIAL": "comercial_code",
};

function parseExcel(buffer: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  // Try to find the sheet
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("historico")) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  return raw
    .map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [excelKey, dbKey] of Object.entries(COL_MAP)) {
        const val = row[excelKey] ?? row[excelKey.toUpperCase()] ?? row[excelKey.toLowerCase()];
        mapped[dbKey] = val;
      }
      // Also try matching keys case-insensitively
      for (const rawKey of Object.keys(row)) {
        const upper = rawKey.toUpperCase().trim();
        if (COL_MAP[upper] && mapped[COL_MAP[upper]] == null) {
          mapped[COL_MAP[upper]] = row[rawKey];
        }
      }
      return mapped as unknown as ParsedRow;
    })
    .filter((r) => r.cod_cliente != null && r.cliente != null && r.vendedor != null);
}

export default function AdminData() {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: number } | null>(null);
  const queryClient = useQueryClient();

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = parseExcel(ev.target!.result as ArrayBuffer);
        setParsedData(data);
        toast({ title: `${data.length} registros detectados`, description: `Archivo: ${file.name}` });
      } catch {
        toast({ title: "Error al leer el archivo", description: "Asegúrate de que es un archivo Excel válido.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleUpload = async () => {
    if (parsedData.length === 0) return;
    setUploading(true);
    setUploadResult(null);

    const BATCH_SIZE = 200;
    let success = 0;
    let errors = 0;

    for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
      const batch = parsedData.slice(i, i + BATCH_SIZE).map((r) => ({
        cod_cliente: Number(r.cod_cliente),
        cliente: String(r.cliente),
        vendedor: String(r.vendedor),
        ventas_2024: r.ventas_2024 != null ? Number(r.ventas_2024) : null,
        ventas_2025: r.ventas_2025 != null ? Number(r.ventas_2025) : null,
        peso_25: r.peso_25 != null ? Number(r.peso_25) : null,
        enero_2026: r.enero_2026 != null ? Number(r.enero_2026) : null,
        febrero_2026: r.febrero_2026 != null ? Number(r.febrero_2026) : null,
        ventas_2026: r.ventas_2026 != null ? Number(r.ventas_2026) : null,
        peso_26: r.peso_26 != null ? Number(r.peso_26) : null,
        proyeccion_2026: r.proyeccion_2026 != null ? Number(r.proyeccion_2026) : null,
        crecimiento_previsto: r.crecimiento_previsto != null ? Number(r.crecimiento_previsto) : null,
        margen_pct: r.margen_pct != null ? Number(r.margen_pct) : null,
        top_truck: r.top_truck != null ? String(r.top_truck) : null,
        delegacion: r.delegacion != null ? String(r.delegacion) : null,
        comercial_code: r.comercial_code != null ? String(r.comercial_code) : null,
      }));

      const { error } = await supabase.from("historico_facturacion").upsert(batch, { onConflict: "cod_cliente" });
      if (error) {
        errors += batch.length;
        console.error("Upsert error:", error);
      } else {
        success += batch.length;
      }
    }

    setUploadResult({ success, errors });
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["historico_facturacion"] });
    queryClient.invalidateQueries({ queryKey: ["vendedores_list"] });
    queryClient.invalidateQueries({ queryKey: ["delegaciones_list"] });

    toast({
      title: errors === 0 ? "Carga completada" : "Carga con errores",
      description: `${success} registros cargados, ${errors} errores.`,
      variant: errors > 0 ? "destructive" : "default",
    });
  };

  const fmt = (v: unknown) =>
    v != null
      ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v))
      : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Datos</h1>
        <p className="text-muted-foreground">Carga y gestiona las tablas de datos del histórico de facturación</p>
      </div>

      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            Cargar Histórico de Facturación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer">
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              <div className="flex items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm transition-colors hover:bg-accent">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <span>{fileName || "Seleccionar archivo Excel/CSV"}</span>
              </div>
            </label>

            {parsedData.length > 0 && (
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Subir {parsedData.length} registros
              </Button>
            )}
          </div>

          {uploadResult && (
            <div className="flex items-center gap-2 text-sm">
              {uploadResult.errors === 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{uploadResult.success} registros cargados correctamente</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span>{uploadResult.success} éxitos, {uploadResult.errors} errores</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DbIcon className="h-5 w-5" />
              Vista previa
              <Badge variant="secondary">{parsedData.length} registros</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cod. Cliente</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Delegación</TableHead>
                    <TableHead className="text-right">Ventas 2024</TableHead>
                    <TableHead className="text-right">Ventas 2025</TableHead>
                    <TableHead className="text-right">Ventas 2026</TableHead>
                    <TableHead className="text-right">Proyección 2026</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.cod_cliente}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{r.cliente}</TableCell>
                      <TableCell>{r.vendedor}</TableCell>
                      <TableCell>{r.delegacion || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(r.ventas_2024)}</TableCell>
                      <TableCell className="text-right">{fmt(r.ventas_2025)}</TableCell>
                      <TableCell className="text-right">{fmt(r.ventas_2026)}</TableCell>
                      <TableCell className="text-right">{fmt(r.proyeccion_2026)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 20 && (
              <p className="text-xs text-muted-foreground p-3">Mostrando 20 de {parsedData.length} registros</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
