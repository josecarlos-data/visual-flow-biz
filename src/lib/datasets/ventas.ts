import * as XLSX from "xlsx";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { DatasetModule } from "./types";

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

export interface VentasParsed {
  clientes: ParsedCliente[];
  ventas: ParsedVenta[];
}

function parseExcel(buffer: ArrayBuffer): VentasParsed {
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

    if (!clientesMap.has(cod)) {
      clientesMap.set(cod, {
        cod_cliente: cod,
        cliente,
        delegacion: (row["Delegación"] as string) ?? (row["Delegacion"] as string) ?? null,
        localidad: (row["Localidad"] as string) ?? null,
        vendedor: (row["Vendedor"] as string) ?? null,
        tipo_cliente: (row["Tip cli"] as string) ?? null,
        observaciones: (row["Observaciones"] as string) ?? null,
        transporte: row["Transport."] != null ? Number(row["Transport."]) : null,
        proyeccion_2026:
          row["Proyección 2026"] != null
            ? Number(row["Proyección 2026"])
            : row["Proyeccion 2026"] != null
            ? Number(row["Proyeccion 2026"])
            : null,
        crecimiento_previsto: row["Crecimiento Previsto"] != null ? Number(row["Crecimiento Previsto"]) : null,
        top_truck: (row["Top Truck"] as string) ?? null,
        gsmart_delegacion: (row["GSmart.DELEGACIÓN"] as string) ?? (row["GSmart.DELEGACION"] as string) ?? null,
        gsmart_comercial: (row["GSmart.COMERCIAL"] as string) ?? null,
      });
    }

    const anio = Number(row["Año"] ?? row["Ano"]);
    const mes = Number(row["MesNumero"]);
    const valor = Number(row["Valor"] ?? 0);
    if (anio && mes && !isNaN(anio) && !isNaN(mes)) {
      ventas.push({ cod_cliente: cod, anio, mes, valor });
    }
  }

  return { clientes: Array.from(clientesMap.values()), ventas };
}

const fmtEUR = (v: unknown) =>
  v != null
    ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v))
    : "—";

export const ventasDataset: DatasetModule<VentasParsed> = {
  key: "ventas",
  name: "Ventas",
  description: "Clientes y ventas mensuales (origen: export RIMOSA)",
  icon: ShoppingBag,
  expectedColumns: ["Cod.", "Cliente", "Delegación", "Vendedor", "Año", "MesNumero", "Valor"],
  parse: parseExcel,
  countLabel: (d) => `${d.clientes.length} clientes y ${d.ventas.length} registros mensuales`,
  rowCount: (d) => d.clientes.length,
  previewColumns: [
    { key: "cod_cliente", label: "Cod." },
    { key: "cliente", label: "Cliente" },
    { key: "vendedor", label: "Vendedor" },
    { key: "delegacion", label: "Delegación" },
    { key: "localidad", label: "Localidad" },
    { key: "proyeccion_2026", label: "Proyección 2026", align: "right", format: fmtEUR },
  ],
  previewRows: (d, limit) => d.clientes.slice(0, limit) as unknown as Record<string, unknown>[],
  upload: async (data) => {
    let success = 0;
    let errors = 0;
    const BATCH = 200;

    await supabase.from("ventas_mensuales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    for (let i = 0; i < data.clientes.length; i += BATCH) {
      const batch = data.clientes.slice(i, i + BATCH);
      const { error } = await supabase.from("clientes").upsert(batch, { onConflict: "cod_cliente" });
      if (error) {
        errors += batch.length;
        console.error("Clientes upsert error:", error);
      } else {
        success += batch.length;
      }
    }

    for (let i = 0; i < data.ventas.length; i += BATCH) {
      const batch = data.ventas.slice(i, i + BATCH);
      const { error } = await supabase.from("ventas_mensuales").upsert(batch, { onConflict: "cod_cliente,anio,mes" });
      if (error) {
        errors += batch.length;
        console.error("Ventas upsert error:", error);
      } else {
        success += batch.length;
      }
    }

    return { success, errors };
  },
  invalidate: (qc) => {
    qc.invalidateQueries({ queryKey: ["historico_data"] });
    qc.invalidateQueries({ queryKey: ["vendedores_list"] });
    qc.invalidateQueries({ queryKey: ["delegaciones_list"] });
  },
};
