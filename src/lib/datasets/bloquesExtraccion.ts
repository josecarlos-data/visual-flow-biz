import Papa from "papaparse";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { DatasetModule, SummaryItem, UploadStageResult } from "./types";
import { resolverOpciones, type OpcionesDef } from "@/lib/motivoCampos";

/**
 * Importación de bloques de visita extraídos fuera de la aplicación.
 *
 * Formato largo, CSV con separador ";" y una fila por campo extraído:
 *   visita_id;bloque_id;orden;motivo_key;campo_key;valor;confianza;cita
 *
 * Numeración: los bloques importados con orden > 0 se guardan en un rango
 * reservado (orden_efectivo = ORDEN_BASE + orden) para no colisionar nunca con
 * los bloques que crea la voz en directo, que numeran desde 0 de forma
 * consecutiva. Todo bloque con orden >= ORDEN_BASE procede de una importación.
 */
export const ORDEN_BASE = 1000;

export const COLUMNAS = [
  "visita_id",
  "bloque_id",
  "orden",
  "motivo_key",
  "campo_key",
  "valor",
  "confianza",
  "cita",
] as const;

const FUENTE_EXTERNA = "texto_externo";

type CsvRow = Record<string, string | undefined>;

export interface Rechazo {
  fila: number;
  motivo: string;
  /** Contenido original de la fila del CSV, para poder consultarla y descargarla. */
  row: CsvRow;
}

export interface BloquePlan {
  visita_id: string;
  orden: number;
  orden_efectivo: number;
  motivo_key: string;
  /** Id del bloque existente al que apunta el plan (null si hay que crearlo). */
  bloque_id: string | null;
  accion: "actualizar" | "crear" | "sobrescribir";
  campos: Record<string, unknown>;
  campos_meta: Record<string, unknown>;
  validacion: string | null;
  nota_revision: string | null;
  /** Solo se escribe motivo_key si difiere del actual. */
  cambia_motivo: boolean;
}

export interface Saltado {
  visita_id: string;
  orden: number;
  motivo: string;
}

export interface BloquesExtraccion {
  filas: number;
  rows: CsvRow[];
  preparado: boolean;
  plan: BloquePlan[];
  sobrescribibles: BloquePlan[];
  saltados: Saltado[];
  rechazos: Rechazo[];
}

const vacio: BloquesExtraccion = {
  filas: 0,
  rows: [],
  preparado: false,
  plan: [],
  sobrescribibles: [],
  saltados: [],
  rechazos: [],
};

/** Acepta "0.85" y "0,85" (Excel en español). */
export function normalizarNumero(v: string | undefined): number | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().replace(/\s/g, "");
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const VERDAD = ["si", "sí", "true", "1", "verdadero", "x"];
const FALSO = ["no", "false", "0", "falso"];

function textoLimpio(v: string | undefined): string {
  return (v ?? "").replace(/^\uFEFF/, "").trim();
}

// ---------------------------------------------------------------- parseo CSV

function parseCsv(buffer: ArrayBuffer): BloquesExtraccion {
  let texto = new TextDecoder("utf-8").decode(buffer);
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);

  const res = Papa.parse<CsvRow>(texto, {
    delimiter: ";",
    quoteChar: '"',
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => textoLimpio(h).toLowerCase(),
  });

  const cabecera = (res.meta.fields ?? []).map((f) => f.trim());
  const faltan = COLUMNAS.filter((c) => !cabecera.includes(c));
  const sobran = cabecera.filter((c) => !(COLUMNAS as readonly string[]).includes(c));
  if (faltan.length || sobran.length) {
    const partes = [
      faltan.length ? `faltan: ${faltan.join(", ")}` : "",
      sobran.length ? `sobran: ${sobran.join(", ")}` : "",
    ].filter(Boolean);
    throw new Error(
      `La cabecera del CSV debe tener exactamente estas 8 columnas: ${COLUMNAS.join(";")}. Encontrado — ${partes.join(" · ")}.`,
    );
  }

  const rechazos: Rechazo[] = res.errors
    .filter((e) => e.row !== undefined)
    .map((e) => ({
      fila: (e.row ?? 0) + 2,
      row: ((res.data ?? [])[e.row ?? 0] ?? {}) as CsvRow,
      motivo: `CSV mal formado: ${e.message}`,
    }));

  const rows = (res.data ?? []).filter((r) => Object.values(r).some((v) => textoLimpio(v) !== ""));

  return { ...vacio, filas: rows.length, rows, rechazos };
}

// ------------------------------------------------------- catálogo de campos

interface CampoDef {
  tipo: string;
  opciones: OpcionesDef;
}

async function cargarEsquema() {
  const [motivos, campos, catalogos] = await Promise.all([
    supabase.from("motivos_visita").select("key"),
    supabase.from("motivo_campos").select("motivo_key,campo_key,tipo,opciones,is_active"),
    supabase.from("catalogos_opciones").select("clave,valor,is_active").eq("is_active", true),
  ]);
  if (motivos.error) throw motivos.error;
  if (campos.error) throw campos.error;
  if (catalogos.error) throw catalogos.error;

  const motivosSet = new Set((motivos.data ?? []).map((m) => m.key));
  const camposMap = new Map<string, CampoDef>();
  for (const c of campos.data ?? []) {
    if (c.is_active === false) continue;
    camposMap.set(`${c.motivo_key}::${c.campo_key}`, { tipo: c.tipo, opciones: c.opciones as OpcionesDef });
  }
  const catalogosMap: Record<string, string[]> = {};
  for (const o of catalogos.data ?? []) {
    (catalogosMap[o.clave] ??= []).push(o.valor);
  }
  return { motivosSet, camposMap, catalogosMap };
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Castea el valor según el tipo del campo. Devuelve el error si no encaja. */
export function castear(
  valor: string,
  def: CampoDef,
  catalogos: Record<string, string[]>,
): { ok: boolean; valor?: unknown; error?: string } {
  const permitidas = () => resolverOpciones(def.opciones, catalogos);
  const encaja = (v: string) => {
    const lista = permitidas();
    if (!lista.length) return v;
    const found = lista.find((o) => sinAcentos(o) === sinAcentos(v));
    return found ?? null;
  };

  switch (def.tipo) {
    case "numero": {
      const n = normalizarNumero(valor);
      return n === null ? { ok: false, error: `"${valor}" no es un número` } : { ok: true, valor: n };
    }
    case "booleano": {
      const s = sinAcentos(valor);
      if (VERDAD.includes(s)) return { ok: true, valor: true };
      if (FALSO.includes(s)) return { ok: true, valor: false };
      return { ok: false, error: `"${valor}" no es un sí/no válido` };
    }
    case "select": {
      const v = encaja(valor);
      return v === null
        ? { ok: false, error: `"${valor}" no está entre las opciones permitidas del campo` }
        : { ok: true, valor: v };
    }
    case "multiselect": {
      const partes = valor.split("|").map((s) => s.trim()).filter(Boolean);
      const salida: string[] = [];
      for (const p of partes) {
        const v = encaja(p);
        if (v === null) return { ok: false, error: `"${p}" no está entre las opciones permitidas del campo` };
        salida.push(v);
      }
      return { ok: true, valor: salida.join(" | ") };
    }
    default:
      return { ok: true, valor: valor };
  }
}

// ------------------------------------------------------------- preparación

interface BloqueBD {
  id: string;
  visita_id: string;
  orden: number;
  motivo_key: string | null;
  campos: Record<string, unknown> | null;
  campos_meta: Record<string, unknown> | null;
  validacion: string | null;
  nota_revision: string | null;
}

const tieneContenido = (c: Record<string, unknown> | null | undefined) =>
  !!c && Object.keys(c).length > 0;

const esExterno = (meta: Record<string, unknown> | null | undefined) => {
  const origen = (meta as { _origen?: { fuente?: string } } | null)?._origen;
  return origen?.fuente === FUENTE_EXTERNA;
};

async function prepare(data: BloquesExtraccion): Promise<BloquesExtraccion> {
  const rechazos: Rechazo[] = [...data.rechazos];
  const { motivosSet, camposMap, catalogosMap } = await cargarEsquema();

  interface Grupo {
    visita_id: string;
    bloque_id: string | null;
    orden: number;
    motivo_key: string;
    campos: Record<string, unknown>;
    campos_meta: Record<string, unknown>;
  }
  const grupos = new Map<string, Grupo>();

  data.rows.forEach((r, i) => {
    const fila = i + 2; // +1 cabecera, +1 base 1
    const visita_id = textoLimpio(r.visita_id);
    const bloque_id = textoLimpio(r.bloque_id) || null;
    const ordenRaw = textoLimpio(r.orden);
    const motivo_key = textoLimpio(r.motivo_key);
    const campo_key = textoLimpio(r.campo_key);
    const valor = (r.valor ?? "").trim();
    const cita = r.cita ?? "";

    if (!visita_id) return rechazos.push({ fila, row: r, motivo: "visita_id vacío" }) && undefined;
    const orden = Number(ordenRaw);
    if (!Number.isInteger(orden) || orden < 0) {
      rechazos.push({ fila, row: r, motivo: `orden "${ordenRaw}" no es un entero >= 0` });
      return;
    }
    if (!motivosSet.has(motivo_key)) {
      rechazos.push({ fila, row: r, motivo: `motivo_key "${motivo_key}" no existe en motivos_visita` });
      return;
    }
    const def = camposMap.get(`${motivo_key}::${campo_key}`);
    if (!def) {
      rechazos.push({ fila, row: r, motivo: `campo_key "${campo_key}" no existe o no está activo en "${motivo_key}"` });
      return;
    }
    const confianzaRaw = (r.confianza ?? "").trim().toLowerCase();
    if (confianzaRaw && !["alta", "media", "baja"].includes(confianzaRaw)) {
      rechazos.push({ fila, row: r, motivo: `confianza "${r.confianza ?? ""}" debe ser alta, media o baja` });
      return;
    }
    const confianza = confianzaRaw || "media";
    if (!valor) {
      rechazos.push({ fila, row: r, motivo: `valor vacío para "${campo_key}"` });
      return;
    }
    const cast = castear(valor, def, catalogosMap);
    if (!cast.ok) {
      rechazos.push({ fila, row: r, motivo: `${campo_key}: ${cast.error}` });
      return;
    }
    if (orden === 0 && !bloque_id) {
      rechazos.push({ fila, row: r, motivo: "orden 0 requiere bloque_id" });
      return;
    }

    const clave = `${visita_id}::${orden}`;
    const g =
      grupos.get(clave) ??
      ({ visita_id, bloque_id, orden, motivo_key, campos: {}, campos_meta: {} } as Grupo);
    g.campos[campo_key] = cast.valor;
    g.campos_meta[campo_key] = { cita, confianza };
    grupos.set(clave, g);
  });

  // Bloques existentes de las visitas implicadas
  const visitaIds = [...new Set([...grupos.values()].map((g) => g.visita_id))];
  const porVisita = new Map<string, BloqueBD[]>();
  for (let i = 0; i < visitaIds.length; i += 200) {
    const { data: bloques, error } = await supabase
      .from("visita_bloques")
      .select("id,visita_id,orden,motivo_key,campos,campos_meta,validacion,nota_revision")
      .in("visita_id", visitaIds.slice(i, i + 200));
    if (error) throw error;
    for (const b of (bloques ?? []) as unknown as BloqueBD[]) {
      const arr = porVisita.get(b.visita_id) ?? [];
      arr.push(b);
      porVisita.set(b.visita_id, arr);
    }
  }

  const en = new Date().toISOString();
  const plan: BloquePlan[] = [];
  const sobrescribibles: BloquePlan[] = [];
  const saltados: Saltado[] = [];

  for (const g of grupos.values()) {
    const existentes = porVisita.get(g.visita_id) ?? [];
    if (!existentes.length) {
      saltados.push({ visita_id: g.visita_id, orden: g.orden, motivo: "la visita no tiene bloques o no existe" });
      continue;
    }
    const base = existentes.find((b) => b.orden === 0) ?? existentes[0];
    const orden_efectivo = g.orden === 0 ? 0 : ORDEN_BASE + g.orden;

    let destino: BloqueBD | undefined;
    if (g.orden === 0) {
      destino = existentes.find((b) => b.id === g.bloque_id);
      if (!destino) {
        saltados.push({ visita_id: g.visita_id, orden: g.orden, motivo: "bloque_id no existe o no pertenece a la visita" });
        continue;
      }
    } else {
      destino = existentes.find((b) => b.orden === orden_efectivo);
    }

    const campos_meta = {
      ...g.campos_meta,
      _origen: { fuente: FUENTE_EXTERNA, en },
    };

    const item: BloquePlan = {
      visita_id: g.visita_id,
      orden: g.orden,
      orden_efectivo,
      motivo_key: g.motivo_key,
      bloque_id: destino?.id ?? null,
      accion: destino ? "actualizar" : "crear",
      campos: g.campos,
      campos_meta,
      validacion: destino ? destino.validacion : base.validacion,
      nota_revision: destino ? destino.nota_revision : base.nota_revision,
      cambia_motivo: !destino || destino.motivo_key !== g.motivo_key,
    };

    if (!destino) {
      plan.push(item);
      continue;
    }
    if (!tieneContenido(destino.campos)) {
      plan.push(item);
      continue;
    }
    if (esExterno(destino.campos_meta)) {
      sobrescribibles.push({ ...item, accion: "sobrescribir" });
      continue;
    }
    saltados.push({
      visita_id: g.visita_id,
      orden: g.orden,
      motivo: "el bloque ya tiene datos de voz o manuales (no se sobrescribe nunca)",
    });
  }

  return { ...data, preparado: true, plan, sobrescribibles, saltados, rechazos };
}

// ------------------------------------------------------------------ escritura

async function escribir(item: BloquePlan): Promise<string | null> {
  try {
    if (item.bloque_id) {
      const patch: Record<string, unknown> = { campos: item.campos, campos_meta: item.campos_meta };
      if (item.cambia_motivo) patch.motivo_key = item.motivo_key;
      const { error } = await supabase
        .from("visita_bloques")
        .update(patch as never)
        .eq("id", item.bloque_id);
      return error ? error.message : null;
    }
    const { error } = await supabase.from("visita_bloques").insert({
      visita_id: item.visita_id,
      motivo_key: item.motivo_key,
      orden: item.orden_efectivo,
      campos: item.campos,
      campos_meta: item.campos_meta,
      validacion: item.validacion ?? "PENDIENTE",
      nota_revision: item.nota_revision,
    } as never);
    return error ? error.message : null;
  } catch (e) {
    return e instanceof Error ? e.message : "error desconocido";
  }
}

export const bloquesExtraccionDataset: DatasetModule<BloquesExtraccion> = {
  key: "bloques_extraccion",
  name: "Bloques de visita (extracción externa)",
  description: "CSV en formato largo con los campos extraídos fuera de la app",
  icon: FileText,
  expectedColumns: [...COLUMNAS],
  parse: parseCsv,
  prepare,
  options: [
    {
      key: "sobrescribir",
      label: "Sobrescribir bloques importados anteriormente",
      description: "Solo afecta a bloques cuyo contenido vino de una importación previa. Nunca pisa datos de voz ni manuales.",
    },
  ],
  summary: (d): SummaryItem[] => [
    { label: "Bloques a actualizar", value: d.plan.filter((p) => p.bloque_id).length },
    { label: "Bloques a crear", value: d.plan.filter((p) => !p.bloque_id).length },
    { label: "Candidatos a sobrescribir", value: d.sobrescribibles.length, tone: "warn" },
    { label: "Bloques saltados", value: d.saltados.length, tone: "warn" },
    { label: "Filas rechazadas", value: d.rechazos.length, tone: d.rechazos.length ? "danger" : "default" },
  ],
  countLabel: (d) =>
    d.preparado
      ? `${d.plan.length + d.sobrescribibles.length} bloques listos · ${d.filas} filas leídas`
      : `${d.filas} filas leídas`,
  rowCount: (d) => d.plan.length + d.sobrescribibles.length,
  previewColumns: [
    { key: "visita_id", label: "Visita" },
    { key: "orden", label: "Orden CSV", align: "right" },
    { key: "accion", label: "Acción" },
    { key: "motivo_key", label: "Plantilla" },
    { key: "num_campos", label: "Campos", align: "right" },
  ],
  previewRows: (d, limit) =>
    [...d.plan, ...d.sobrescribibles].slice(0, limit).map((p) => ({
      visita_id: p.visita_id,
      orden: p.orden,
      accion: p.accion,
      motivo_key: p.motivo_key,
      num_campos: Object.keys(p.campos).length,
    })),
  upload: async (d, options) => {
    const sobrescribir = options?.sobrescribir === true;
    const items = sobrescribir ? [...d.plan, ...d.sobrescribibles] : d.plan;

    let actualizados = 0;
    let creados = 0;
    let sobrescritos = 0;
    const fallos: string[] = [];

    const CONC = 5;
    for (let i = 0; i < items.length; i += CONC) {
      const lote = items.slice(i, i + CONC);
      const res = await Promise.all(lote.map((it) => escribir(it)));
      res.forEach((err, j) => {
        const it = lote[j];
        if (err) {
          fallos.push(`${it.visita_id} (orden ${it.orden}): ${err}`);
        } else if (it.accion === "sobrescribir") sobrescritos++;
        else if (it.bloque_id) actualizados++;
        else creados++;
      });
    }

    const saltadosPorCasilla = sobrescribir ? 0 : d.sobrescribibles.length;
    const stages: UploadStageResult[] = [
      { name: "Bloques actualizados", success: actualizados, errors: 0 },
      { name: "Bloques creados", success: creados, errors: 0 },
      {
        name: "Bloques sobrescritos",
        success: sobrescritos,
        errors: 0,
        message: saltadosPorCasilla ? `${saltadosPorCasilla} candidatos no tocados (casilla desactivada)` : undefined,
      },
      {
        name: "Bloques saltados (salvaguarda)",
        success: 0,
        errors: d.saltados.length,
        message: d.saltados.slice(0, 3).map((s) => `${s.visita_id}#${s.orden}: ${s.motivo}`).join(" · ") || undefined,
      },
      {
        name: "Filas rechazadas por validación",
        success: 0,
        errors: d.rechazos.length,
        message: d.rechazos.slice(0, 5).map((r) => `fila ${r.fila}: ${r.motivo}`).join(" · ") || undefined,
      },
      {
        name: "Fallos de escritura (red o permisos)",
        success: 0,
        errors: fallos.length,
        message: fallos.slice(0, 5).join(" · ") || undefined,
      },
    ];

    const success = actualizados + creados + sobrescritos;
    const errors = fallos.length + d.rechazos.length + d.saltados.length;
    return {
      success,
      errors,
      stages,
      message:
        fallos.length === 0
          ? `${success} bloques escritos. La validación y las notas de revisión no se han modificado.`
          : `${success} bloques escritos y ${fallos.length} fallos de escritura. Puedes reintentar: la importación es idempotente.`,
    };
  },
  invalidate: (qc) => {
    qc.invalidateQueries({ queryKey: ["crm_visita_bloques"] });
    qc.invalidateQueries({ queryKey: ["crm_visitas"] });
    qc.invalidateQueries({ queryKey: ["crm_visitas_revision"] });
    qc.invalidateQueries({ queryKey: ["crm_cliente_visitas"] });
  },
};
