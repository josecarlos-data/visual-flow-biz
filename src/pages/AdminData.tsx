import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Database as DbIcon, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DATASETS, type DatasetModule } from "@/lib/datasets";

export default function AdminData() {
  const [activeKey, setActiveKey] = useState<string>(DATASETS[0]?.key ?? "");
  const [parsedData, setParsedData] = useState<unknown>(null);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: number } | null>(null);
  const queryClient = useQueryClient();

  const dataset = useMemo(
    () => DATASETS.find((d) => d.key === activeKey) as DatasetModule<unknown> | undefined,
    [activeKey],
  );

  const resetState = () => {
    setParsedData(null);
    setFileName("");
    setUploadResult(null);
  };

  const handleSelectDataset = (key: string) => {
    if (key === activeKey) return;
    setActiveKey(key);
    resetState();
  };

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !dataset) return;
      setFileName(file.name);
      setUploadResult(null);

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = dataset.parse(ev.target!.result as ArrayBuffer);
          setParsedData(data);
          toast({
            title: dataset.countLabel(data),
            description: `Archivo: ${file.name}`,
          });
        } catch (err) {
          console.error("Parse error:", err);
          toast({
            title: "Error al leer el archivo",
            description: "Asegúrate de que es un archivo Excel válido y con las columnas esperadas.",
            variant: "destructive",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [dataset],
  );

  const handleUpload = async () => {
    if (!dataset || !parsedData || dataset.rowCount(parsedData) === 0) return;
    setUploading(true);
    setUploadResult(null);

    const result = await dataset.upload(parsedData);
    setUploadResult(result);
    setUploading(false);
    dataset.invalidate(queryClient);

    toast({
      title: result.errors === 0 ? "Carga completada" : "Carga con errores",
      description: `${result.success} registros cargados. ${result.errors} errores.`,
      variant: result.errors > 0 ? "destructive" : "default",
    });
  };

  const previewRows = dataset && parsedData ? dataset.previewRows(parsedData, 20) : [];
  const totalRows = dataset && parsedData ? dataset.rowCount(parsedData) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Datos</h1>
        <p className="text-muted-foreground">Selecciona qué tipo de información vas a cargar</p>
      </div>

      {/* Dataset selector */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DATASETS.map((d) => {
          const Icon = d.icon;
          const isActive = d.key === activeKey;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => handleSelectDataset(d.key)}
              className={cn(
                "group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                isActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-input hover:bg-accent",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{d.name}</span>
                  {isActive && <Badge variant="secondary" className="text-xs">Seleccionado</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{d.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {dataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-5 w-5" />
              Cargar archivo de {dataset.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Columnas esperadas: </span>
              {dataset.expectedColumns.join(" · ")}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="cursor-pointer">
                <Input
                  key={activeKey}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                  className="hidden"
                />
                <div className="flex items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm transition-colors hover:bg-accent">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <span>{fileName || "Seleccionar archivo Excel"}</span>
                </div>
              </label>

              {totalRows > 0 && (
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Subir {totalRows} registros
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
                    <span>
                      {uploadResult.success} éxitos, {uploadResult.errors} errores
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {dataset && parsedData && totalRows > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DbIcon className="h-5 w-5" />
              Vista previa
              <Badge variant="secondary">{dataset.countLabel(parsedData)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {dataset.previewColumns.map((c) => (
                      <TableHead key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {dataset.previewColumns.map((c) => {
                        const v = row[c.key];
                        const display = c.format ? c.format(v) : v != null ? String(v) : "—";
                        return (
                          <TableCell
                            key={c.key}
                            className={cn(c.align === "right" ? "text-right" : "", "max-w-[220px] truncate")}
                          >
                            {display}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalRows > 20 && (
              <p className="text-xs text-muted-foreground p-3">Mostrando 20 de {totalRows} registros</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
