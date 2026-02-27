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

interface ParsedCliente {
  cod_cliente: number;
  cliente: string;
  delegacion: string | null;
  localidad: string | null;
  vendedor: string | null;
  tipo_cliente: string | null;
  observaciones: string | null;
  transporte: number | null;
  proyeccion_2026: number | null;
  crecimiento_previsto: number | null;
  top_truck: string | null;
  gsmart_delegacion: string | null;
  gsmart_comercial: string | null;
}

interface ParsedVenta {
  cod_cliente: number;
  anio: number;
  mes: number;
  valor: number;
}

interface ParsedData {
  clientes: ParsedCliente[];
  ventas: ParsedVenta[];
}

function parseExcel(buffer: ArrayBuffer): ParsedData {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const clientesMap = new Map<number, ParsedCliente>();
  const ventas: ParsedVenta[] = [];

  for (const row of raw) {
    const cod = Number(row["Cod."] ?? row["Cod"] ?? row["cod_cliente"]);
    if (!cod || isNaN(cod)) continue;

    const cliente = String(row["Cliente"] ?? row["cliente"] ?? "");
    if (!cliente) continue;

    // Upsert client master data
    if (!clientesMap.has(cod)) {
      clientesMap.set(cod, {
        cod_cliente: cod,
        cliente,
        delegacion: row["Delegación"] as string ?? row["Delegacion"] as string ?? null,
        localidad: row["Localidad"] as string ?? null,
        vendedor: row["Vendedor"] as string ?? null,
        tipo_cliente: row["Tip cli"] as string ?? null,
        observaciones: row["Observaciones"] as string ?? null,
        transporte: row["Transport."] != null ? Number(row["Transport."]) : null,
        proyeccion_2026: row["Proyección 2026"] != null ? Number(row["Proyección 2026"]) : (row["Proyeccion 2026"] != null ? Number(row["Proyeccion 2026"]) : null),
        crecimiento_previsto: row["Crecimiento Previsto"] != null ? Number(row["Crecimiento Previsto"]) : null,
        top_truck: row["Top Truck"] as string ?? null,
        gsmart_delegacion: row["GSmart.DELEGACIÓN"] as string ?? row["GSmart.DELEGACION"] as string ?? null,
        gsmart_comercial: row["GSmart.COMERCIAL"] as string ?? null,
      });
    }

    // Parse monthly sales
    const anio = Number(row["Año"] ?? row["Ano"]);
    const mes = Number(row["MesNumero"]);
    const valor = Number(row["Valor"] ?? 0);

    if (anio && mes && !isNaN(anio) && !isNaN(mes)) {
      ventas.push({ cod_cliente: cod, anio, mes, valor });
    }
  }

  return {
    clientes: Array.from(clientesMap.values()),
    ventas,
  };
}

export default function AdminData() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
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
        toast({
          title: `${data.clientes.length} clientes y ${data.ventas.length} registros de ventas detectados`,
          description: `Archivo: ${file.name}`,
        });
      } catch {
        toast({ title: "Error al leer el archivo", description: "Asegúrate de que es un archivo Excel válido.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleUpload = async () => {
    if (!parsedData || parsedData.clientes.length === 0) return;
    setUploading(true);
    setUploadResult(null);

    let success = 0;
    let errors = 0;
    const BATCH = 200;

    // 1. Delete existing data
    await supabase.from("ventas_mensuales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Upsert clientes
    for (let i = 0; i < parsedData.clientes.length; i += BATCH) {
      const batch = parsedData.clientes.slice(i, i + BATCH).map((c) => ({
        cod_cliente: c.cod_cliente,
        cliente: c.cliente,
        delegacion: c.delegacion,
        localidad: c.localidad,
        vendedor: c.vendedor,
        tipo_cliente: c.tipo_cliente,
        observaciones: c.observaciones,
        transporte: c.transporte,
        proyeccion_2026: c.proyeccion_2026,
        crecimiento_previsto: c.crecimiento_previsto,
        top_truck: c.top_truck,
        gsmart_delegacion: c.gsmart_delegacion,
        gsmart_comercial: c.gsmart_comercial,
      }));

      const { error } = await supabase.from("clientes").upsert(batch, { onConflict: "cod_cliente" });
      if (error) {
        errors += batch.length;
        console.error("Clientes upsert error:", error);
      } else {
        success += batch.length;
      }
    }

    // 3. Insert ventas mensuales
    let ventasSuccess = 0;
    let ventasErrors = 0;
    for (let i = 0; i < parsedData.ventas.length; i += BATCH) {
      const batch = parsedData.ventas.slice(i, i + BATCH).map((v) => ({
        cod_cliente: v.cod_cliente,
        anio: v.anio,
        mes: v.mes,
        valor: v.valor,
      }));

      const { error } = await supabase.from("ventas_mensuales").upsert(batch, { onConflict: "cod_cliente,anio,mes" });
      if (error) {
        ventasErrors += batch.length;
        console.error("Ventas upsert error:", error);
      } else {
        ventasSuccess += batch.length;
      }
    }

    const totalErrors = errors + ventasErrors;
    setUploadResult({ success: success + ventasSuccess, errors: totalErrors });
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["historico_data"] });
    queryClient.invalidateQueries({ queryKey: ["vendedores_list"] });
    queryClient.invalidateQueries({ queryKey: ["delegaciones_list"] });

    toast({
      title: totalErrors === 0 ? "Carga completada" : "Carga con errores",
      description: `${success} clientes, ${ventasSuccess} ventas cargadas. ${totalErrors} errores.`,
      variant: totalErrors > 0 ? "destructive" : "default",
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
        <p className="text-muted-foreground">Carga y gestiona los datos de ventas mensuales por cliente</p>
      </div>

      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            Cargar Datos de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer">
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              <div className="flex items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm transition-colors hover:bg-accent">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <span>{fileName || "Seleccionar archivo Excel"}</span>
              </div>
            </label>

            {parsedData && parsedData.clientes.length > 0 && (
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Subir {parsedData.clientes.length} clientes
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
      {parsedData && parsedData.clientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DbIcon className="h-5 w-5" />
              Vista previa
              <Badge variant="secondary">{parsedData.clientes.length} clientes</Badge>
              <Badge variant="outline">{parsedData.ventas.length} registros mensuales</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cod.</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Delegación</TableHead>
                    <TableHead>Localidad</TableHead>
                    <TableHead className="text-right">Proyección 2026</TableHead>
                    <TableHead className="text-right">Meses datos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.clientes.slice(0, 20).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.cod_cliente}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{c.cliente}</TableCell>
                      <TableCell>{c.vendedor || "—"}</TableCell>
                      <TableCell>{c.delegacion || "—"}</TableCell>
                      <TableCell>{c.localidad || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(c.proyeccion_2026)}</TableCell>
                      <TableCell className="text-right">
                        {parsedData.ventas.filter((v) => v.cod_cliente === c.cod_cliente).length}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.clientes.length > 20 && (
              <p className="text-xs text-muted-foreground p-3">Mostrando 20 de {parsedData.clientes.length} clientes</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
