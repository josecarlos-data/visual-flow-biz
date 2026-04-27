import * as XLSX from "xlsx";
import { Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { DatasetModule } from "./types";

interface ParsedCompra {
  proveedor: string;
  referencia: string;
  importe: number;
  fecha: string; // ISO date YYYY-MM-DD
  categoria: string | null;
}

export interface ComprasParsed {
  compras: ParsedCompra[];
}

function toIsoDate(raw: unknown): string | null {
  if (raw == null) return null;
  // Excel serial date
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    const yyyy = d.y.toString().padStart(4, "0");
    const mm = d.m.toString().padStart(2, "0");
    const dd = d.d.toString().padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(raw).trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yy = m[3];
    if (yy.length === 2) yy = "20" + yy;
    return `${yy}-${mm}-${dd}`;
  }
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseExcel(buffer: ArrayBuffer): ComprasParsed {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const compras: ParsedCompra[] = [];
  for (const row of raw) {
    const proveedor = String(row["Proveedor"] ?? row["proveedor"] ?? "").trim();
    const referencia = String(row["Referencia"] ?? row["referencia"] ?? "").trim();
    const importe = Number(row["Importe"] ?? row["importe"] ?? 0);
    const fecha = toIsoDate(row["Fecha"] ?? row["fecha"]);
    const categoria = (row["Categoría"] as string) ?? (row["Categoria"] as string) ?? null;

    if (!proveedor || !referencia || !fecha || isNaN(importe)) continue;
    compras.push({ proveedor, referencia, importe, fecha, categoria });
  }
  return { compras };
}

const fmtEUR = (v: unknown) =>
  v != null
    ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v))
    : "—";

const fmtDate = (v: unknown) => {
  if (!v) return "—";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

export const comprasDataset: DatasetModule<ComprasParsed> = {
  key: "compras",
  name: "Compras",
  description: "Pedidos y facturas de proveedores",
  icon: Truck,
  expectedColumns: ["Proveedor", "Referencia", "Importe", "Fecha", "Categoría (opcional)"],
  parse: parseExcel,
  countLabel: (d) => `${d.compras.length} compras detectadas`,
  rowCount: (d) => d.compras.length,
  previewColumns: [
    { key: "proveedor", label: "Proveedor" },
    { key: "referencia", label: "Referencia" },
    { key: "categoria", label: "Categoría" },
    { key: "fecha", label: "Fecha", format: fmtDate },
    { key: "importe", label: "Importe", align: "right", format: fmtEUR },
  ],
  previewRows: (d, limit) => d.compras.slice(0, limit) as unknown as Record<string, unknown>[],
  upload: async (data) => {
    let success = 0;
    let errors = 0;
    const BATCH = 200;

    // Reemplazo completo (clean + insert)
    await supabase.from("compras").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    for (let i = 0; i < data.compras.length; i += BATCH) {
      const batch = data.compras.slice(i, i + BATCH);
      const { error } = await supabase.from("compras").insert(batch);
      if (error) {
        errors += batch.length;
        console.error("Compras insert error:", error);
      } else {
        success += batch.length;
      }
    }
    return { success, errors };
  },
  invalidate: (qc) => {
    qc.invalidateQueries({ queryKey: ["compras_data"] });
  },
};
