/**
 * Banco de pruebas del prompt de extracción de `visita-voz`.
 *
 * Se reejecuta CADA VEZ que se toca el prompt: es la única referencia de si un cambio
 * arregla lo que pretende sin romper lo que ya funcionaba.
 *
 *   bun scripts/bench-visita-voz/bench.ts            # fase4.2 vs versión actual
 *   bun scripts/bench-visita-voz/bench.ts --solo-actual
 *
 * Necesita en el entorno: LOVABLE_API_KEY y SUPABASE_DB_URL (catálogo de plantillas).
 * Escribe el resultado en RESULTADOS.md, junto a este fichero.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  admiteIA,
  esquemaExtraccion,
  MODELO_EXTRACCION,
  sistemaExtraccion,
  usuarioExtraccion,
  VERSION_PROMPT,
  type CampoDef,
  type MotivoDef,
} from "../../supabase/functions/_shared/visita-voz-prompt.ts";
import { EXTRA_COMPETENCIA_FASE42, sistemaFase42, VERSION_ANTERIOR } from "./prompt-fase4.2.ts";

const DIR = import.meta.dir;
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface Caso {
  id: string;
  etiqueta: string;
  cliente: string;
  narracion: string;
  esperado: {
    motivos: string[];
    competencia_bloques: number;
    seguimiento_permitido: boolean;
    notas: string;
  };
}

// ------------------------------------------------------------------ catálogo

function sql<T>(query: string): T {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Falta SUPABASE_DB_URL");
  const out = execFileSync("psql", [url, "-Atqc", query], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out.trim() || "[]") as T;
}

function cargarMotivos(): MotivoDef[] {
  const motivos = sql<{ key: string; nombre: string; descripcion: string | null }[]>(
    `select coalesce(json_agg(json_build_object('key',key,'nombre',nombre,'descripcion',descripcion) order by sort_order),'[]')
     from motivos_visita where is_active`,
  );
  const campos = sql<(CampoDef & { is_active: boolean; visibilidad: string; opciones_raw: unknown })[]>(
    `select coalesce(json_agg(json_build_object(
        'motivo_key',c.motivo_key,'campo_key',c.campo_key,'label',c.label,'ayuda',c.ayuda,'tipo',c.tipo,
        'is_required',c.is_required,'requerido_validacion',c.requerido_validacion,'sort_order',c.sort_order,
        'is_active',c.is_active,'visibilidad',c.visibilidad,'opciones_raw',c.opciones) order by c.sort_order),'[]')
     from motivo_campos c`,
  );
  const catalogos = sql<{ clave: string; valor: string }[]>(
    `select coalesce(json_agg(json_build_object('clave',clave,'valor',valor) order by orden),'[]')
     from catalogos_opciones where is_active`,
  );
  const porClave: Record<string, string[]> = {};
  for (const c of catalogos) (porClave[c.clave] ??= []).push(c.valor);

  const resolver = (o: unknown): string[] => {
    if (Array.isArray(o)) return o.map(String).filter(Boolean);
    if (o && typeof o === "object") {
      const clave = (o as { catalogo?: string }).catalogo;
      if (clave) return porClave[clave] ?? [];
    }
    return [];
  };

  const activos: CampoDef[] = campos
    .filter((c) => admiteIA(c))
    .map((c) => ({ ...c, opciones: resolver(c.opciones_raw) }));

  return motivos
    .map((m) => ({ ...m, campos: activos.filter((c) => c.motivo_key === m.key) }))
    .filter((m) => m.campos.length > 0);
}

// ------------------------------------------------------------------ llamada

/** Reconstruye el esquema de fase4.2 (idéntico salvo la coletilla de competencia). */
function esquemaFase42(motivos: MotivoDef[]) {
  const esquema = esquemaExtraccion(motivos) as {
    properties: Record<string, { description: string }>;
  };
  const comp = esquema.properties["bloques_competencia"];
  if (comp) {
    comp.description =
      comp.description.split(" OBLIGATORIO:")[0] + EXTRA_COMPETENCIA_FASE42;
  }
  return esquema;
}

async function llamar(sistema: string, usuario: string, schema: unknown, modelo = MODELO_EXTRACCION) {
  const t0 = Date.now();
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelo,
      reasoning_effort: "none",
      temperature: 0,
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: usuario },
      ],
      response_format: { type: "json_schema", json_schema: { name: "informe_visita", strict: true, schema } },
    }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) throw new Error(`[${res.status}] ${(await res.text()).slice(0, 400)}`);
  const body = await res.json();
  return {
    ms,
    uso: body.usage ?? {},
    salida: JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>,
  };
}

// ------------------------------------------------------------------ análisis

interface Resumen {
  motivos: string[];
  competencia: number;
  seguimiento: number;
  campos: number;
  fueraEnum: string[];
  ms: number;
  tokens: number;
}

function resumir(salida: Record<string, unknown>, motivos: MotivoDef[], ms: number, uso: Record<string, number>): Resumen {
  const presentes: string[] = [];
  const fueraEnum: string[] = [];
  let competencia = 0;
  let seguimiento = 0;
  let campos = 0;

  for (const m of motivos) {
    const lista = salida[`bloques_${m.key}`];
    if (!Array.isArray(lista)) continue;
    const conDatos = lista.filter((b) => {
      const c = (b?.campos ?? {}) as Record<string, unknown>;
      return Object.values(c).some((v) => v !== null && String(v ?? "").trim() !== "");
    });
    if (!conDatos.length) continue;
    presentes.push(m.key);
    if (m.key === "competencia") competencia = conDatos.length;
    if (m.key === "seguimiento") seguimiento = conDatos.length;
    for (const b of conDatos) {
      const valores = (b.campos ?? {}) as Record<string, unknown>;
      for (const def of m.campos) {
        const v = valores[def.campo_key];
        if (v === null || String(v ?? "").trim() === "") continue;
        campos++;
        if (def.tipo === "select" && def.opciones.length && !def.opciones.includes(String(v))) {
          fueraEnum.push(`${m.key}.${def.campo_key}="${v}"`);
        }
      }
    }
  }
  return { motivos: presentes, competencia, seguimiento, campos, fueraEnum, ms, tokens: uso.total_tokens ?? 0 };
}

const veredicto = (r: Resumen, e: Caso["esperado"]) => {
  const fallos: string[] = [];
  const faltan = e.motivos.filter((m) => !r.motivos.includes(m));
  if (faltan.length) fallos.push(`faltan motivos: ${faltan.join(", ")}`);
  if (r.competencia !== e.competencia_bloques) {
    fallos.push(`bloques competencia ${r.competencia}, esperados ${e.competencia_bloques}`);
  }
  if (!e.seguimiento_permitido && r.seguimiento > 0) fallos.push("seguimiento sobrante");
  if (r.fueraEnum.length) fallos.push(`selects fuera de enum: ${r.fueraEnum.join(", ")}`);
  return fallos.length ? fallos.join(" | ") : "OK";
};

// ------------------------------------------------------------------ main

const soloActual = process.argv.includes("--solo-actual");
const casos = JSON.parse(readFileSync(join(DIR, "narraciones.json"), "utf8")) as Caso[];
const motivos = cargarMotivos();
const versiones = soloActual
  ? [{ nombre: VERSION_PROMPT, sistema: sistemaExtraccion(motivos), schema: esquemaExtraccion(motivos) }]
  : [
      { nombre: VERSION_ANTERIOR, sistema: sistemaFase42(motivos), schema: esquemaFase42(motivos) },
      { nombre: VERSION_PROMPT, sistema: sistemaExtraccion(motivos), schema: esquemaExtraccion(motivos) },
    ];

const filas: string[] = [];
for (const caso of casos) {
  const usuario = usuarioExtraccion(caso.narracion, caso.cliente);
  for (const v of versiones) {
    try {
      const { ms, uso, salida } = await llamar(v.sistema, usuario, v.schema);
      const r = resumir(salida, motivos, ms, uso);
      filas.push(
        `| ${caso.etiqueta} | ${v.nombre} | ${r.motivos.join(", ") || "—"} | ${r.competencia} | ${r.seguimiento} | ${r.campos} | ${r.fueraEnum.length} | ${(r.ms / 1000).toFixed(1)} s | ${r.tokens} | ${veredicto(r, caso.esperado)} |`,
      );
      console.log(filas[filas.length - 1]);
    } catch (e) {
      filas.push(`| ${caso.etiqueta} | ${v.nombre} | ERROR | | | | | | | ${(e as Error).message} |`);
      console.error(filas[filas.length - 1]);
    }
  }
}

const md =
  `# Resultados del banco de pruebas — ${new Date().toISOString().slice(0, 10)}\n\n` +
  `Modelo: \`${MODELO_EXTRACCION}\`. Narraciones: \`narraciones.json\` (observaciones reales del histórico).\n\n` +
  "| Narración | Versión | Motivos | Bloques competencia | Bloques seguimiento | Campos rellenos | Fuera de enum | Latencia | Tokens | Veredicto |\n" +
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n" +
  filas.join("\n") + "\n\n" +
  "Resultado esperado de cada narración, en `narraciones.json` (`esperado`).\n";

writeFileSync(join(DIR, "RESULTADOS-ultima-ejecucion.md"), md);
console.log("\nEscrito RESULTADOS-ultima-ejecucion.md");
