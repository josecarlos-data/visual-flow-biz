import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders } from "../_shared/cors.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

/**
 * Extracción: clasificar y rellenar campos con reglas explícitas. No es razonamiento,
 * por eso va con el modelo rápido y `reasoning_effort: "none"`.
 * Nota: de momento se llama por la pasarela de Lovable. La llamada directa al
 * proveedor (misma API OpenAI-compatible, cambiando base URL y clave) queda
 * documentada aquí pero NO implementada.
 */
const MODELO_EXTRACCION = "openai/gpt-5.6-luna";
const MODELO_TRANSCRIPCION = "openai/gpt-4o-transcribe";

/**
 * Versión del prompt de extracción. Se guarda en `visitas.analisis_prompt_version`
 * para poder comparar calidad entre versiones.
 *
 * HISTORIAL
 * - fase4.1 (07/08/2026) — Primera versión multibloque: 11 motivos, un array por motivo,
 *   `campos_meta` con cita literal completa y confianza. Modelo openai/gpt-5.6-sol.
 * - fase4.2 (08/08/2026) — Tras probar con tres narraciones reales:
 *   · Modelo de extracción a openai/gpt-5.6-luna (+ temperature 0 si el modelo lo admite).
 *   · Regla imperativa: competidor o precio ajeno => SIEMPRE bloque `competencia`
 *     ADEMÁS del bloque de seguimiento/revisión que corresponda.
 *   · Citas acortadas a 5-10 palabras (antes frase completa).
 *   · System prompt fijo y cacheado, idéntico entre llamadas (prompt caching).
 *   · Transcripción con vocabulario del sector en el parámetro `prompt`.
 *   · Referencias basura descartadas en servidor (mínimo 3 caracteres y algún dígito).
 *   · El cliente nunca se deduce de la transcripción: viene dado por la app.
 */
const VERSION_PROMPT = "fase4.2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const mensajeError = (status: number, generico: string) =>
  status === 429
    ? "Demasiadas peticiones a la IA. Espera unos segundos e inténtalo de nuevo."
    : status === 402
    ? "Se han agotado los créditos de IA del espacio de trabajo."
    : generico;

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// ---------------------------------------------------------------- catálogo

interface CampoDef {
  motivo_key: string;
  campo_key: string;
  label: string;
  ayuda: string | null;
  tipo: string;
  is_required: boolean;
  requerido_validacion: boolean;
  sort_order: number;
  opciones: string[];
}

interface MotivoDef {
  key: string;
  nombre: string;
  descripcion: string | null;
  campos: CampoDef[];
}

/** Campos que NUNCA van al modelo: inactivos, de sistema, adjuntos y campañas. */
function admiteIA(c: { is_active: boolean; visibilidad: string; tipo: string }) {
  return (
    c.is_active &&
    c.visibilidad === "normal" &&
    c.tipo !== "adjunto" &&
    c.tipo !== "referencia_campana"
  );
}

interface Catalogo {
  motivos: MotivoDef[];
  competidores: string[];
}

/**
 * El catálogo se cachea en memoria de la instancia: así el system prompt sale
 * idéntico carácter por carácter entre llamadas y el proveedor puede cachearlo.
 */
let cache: { valor: Catalogo; hasta: number } | null = null;
const TTL_CACHE_MS = 5 * 60 * 1000;

async function cargarCatalogo(): Promise<Catalogo> {
  if (cache && cache.hasta > Date.now()) return cache.valor;
  const db = admin();

  const [mRes, cRes, catRes] = await Promise.all([
    db.from("motivos_visita").select("key, nombre, descripcion, sort_order, is_active").eq("is_active", true).order("sort_order"),
    db.from("motivo_campos").select("*").order("sort_order"),
    db.from("catalogos_opciones").select("clave, valor, orden").eq("is_active", true).order("orden"),
  ]);
  if (mRes.error) throw mRes.error;
  if (cRes.error) throw cRes.error;

  const catalogos: Record<string, string[]> = {};
  for (const row of (catRes.data ?? []) as { clave: string; valor: string }[]) {
    (catalogos[row.clave] ??= []).push(row.valor);
  }

  const resolver = (opciones: unknown): string[] => {
    if (Array.isArray(opciones)) return opciones.map(String).filter(Boolean);
    if (opciones && typeof opciones === "object") {
      const clave = (opciones as { catalogo?: string }).catalogo;
      if (clave) return catalogos[clave] ?? [];
    }
    return [];
  };

  const campos = ((cRes.data ?? []) as Record<string, unknown>[])
    .filter((c) => admiteIA(c as never))
    .map((c) => ({
      motivo_key: String(c.motivo_key),
      campo_key: String(c.campo_key),
      label: String(c.label),
      ayuda: (c.ayuda as string) ?? null,
      tipo: String(c.tipo),
      is_required: Boolean(c.is_required),
      requerido_validacion: Boolean(c.requerido_validacion),
      sort_order: Number(c.sort_order ?? 0),
      opciones: resolver(c.opciones),
    })) as CampoDef[];

  const motivos = ((mRes.data ?? []) as { key: string; nombre: string; descripcion: string | null }[])
    .map((m) => ({ ...m, campos: campos.filter((c) => c.motivo_key === m.key) }))
    .filter((m) => m.campos.length > 0);

  const valor: Catalogo = { motivos, competidores: catalogos["competidores"] ?? [] };
  cache = { valor, hasta: Date.now() + TTL_CACHE_MS };
  return valor;
}

// ------------------------------------------------------- vocabulario de audio

/** Términos del sector que el transcriptor confunde ("Icer" -> "Ize", "el polígono" -> "Alpoliva"). */
const VOCABULARIO_BASE = [
  "albarán", "referencia", "rappel", "GSMart", "Top Truck", "delegación", "polígono",
  "electromecánico", "ejes SAF", "ejes BPW", "pastillas", "discos",
  "Icer", "Febi", "Dometic", "Sachs", "TitanX", "Knorr",
  "Volvo", "Scania", "DAF", "Ford", "Eurorrecambios",
];

let vocabCache: { texto: string; hasta: number } | null = null;

async function vocabularioTranscripcion(): Promise<string> {
  if (vocabCache && vocabCache.hasta > Date.now()) return vocabCache.texto;
  const terminos = [...VOCABULARIO_BASE];
  try {
    const { competidores } = await cargarCatalogo();
    terminos.push(...competidores);
    const { data } = await admin().rpc("get_distinct_vendedores" as never);
    for (const v of (data ?? []) as { vendedor: string }[]) {
      if (v?.vendedor) terminos.push(String(v.vendedor));
    }
  } catch (e) {
    console.error("No se ha podido ampliar el vocabulario:", (e as Error).message);
  }
  const texto =
    "Nota de voz de un comercial de recambios de automoción en España. Vocabulario habitual: " +
    [...new Set(terminos)].join(", ") + ".";
  vocabCache = { texto, hasta: Date.now() + TTL_CACHE_MS };
  return texto;
}

// ---------------------------------------------------------------- esquema

/** Descripción de un campo para el modelo: la ayuda de la plantilla es la fuente. */
function descripcionCampo(c: CampoDef): string {
  const partes = [`${c.label}.`];
  if (c.ayuda) partes.push(c.ayuda);
  if (c.opciones.length) partes.push(`Elige SIEMPRE uno de estos valores exactos: ${c.opciones.join(" / ")}.`);
  if (c.tipo === "multiselect") partes.push("Si son varios, sepáralos con ' | '.");
  if (c.tipo === "booleano") partes.push("Responde 'si' o 'no'.");
  if (c.tipo === "numero") partes.push("Solo el número, sin símbolo de moneda.");
  if (c.tipo === "fecha") partes.push("Formato AAAA-MM-DD.");
  if (c.tipo === "referencia") {
    partes.push(
      "Devuelve la referencia TAL CUAL la dice el comercial, sin corregirla ni completarla. " +
        "Debe ser una referencia de verdad (lleva dígitos); nunca una palabra suelta de la conversación. " +
        "Si no menciona ninguna, null.",
    );
  }
  partes.push("null si la narración no dice nada de este punto.");
  return partes.join(" ");
}

function esquemaCampos(campos: CampoDef[]) {
  const properties: Record<string, unknown> = {};
  for (const c of campos) {
    properties[c.campo_key] = {
      type: c.tipo === "numero" ? ["number", "null"] : ["string", "null"],
      description: descripcionCampo(c),
    };
  }
  return {
    type: "object",
    properties,
    required: campos.map((c) => c.campo_key),
    additionalProperties: false,
  };
}

const DESC_CITA =
  "Fragmento LITERAL de la transcripción, de 5 a 10 palabras, que justifica el valor. No la frase entera, solo el trozo que lo prueba.";

function esquemaBloque(m: MotivoDef) {
  return {
    type: "object",
    properties: {
      campos: esquemaCampos(m.campos),
      evidencias: {
        type: "array",
        description:
          "Una entrada por cada campo que hayas rellenado (no para los que dejas a null), con el fragmento literal que lo justifica.",
        items: {
          type: "object",
          properties: {
            campo: { type: "string", enum: m.campos.map((c) => c.campo_key) },
            cita: { type: "string", description: DESC_CITA },
            confianza: { type: "string", enum: ["alta", "media", "baja"] },
          },
          required: ["campo", "cita", "confianza"],
          additionalProperties: false,
        },
      },
    },
    required: ["campos", "evidencias"],
    additionalProperties: false,
  };
}

function esquemaExtraccion(motivos: MotivoDef[]) {
  const properties: Record<string, unknown> = {
    resultado_visita: {
      type: "string",
      enum: ["efectiva", "cliente_ausente", "cerrado", "sin_acceso"],
      description:
        "efectiva = ha hablado con el cliente. cliente_ausente = no estaba. cerrado = el taller estaba cerrado. sin_acceso = no le han dejado pasar.",
    },
  };
  for (const m of motivos) {
    const extra =
      m.key === "competencia"
        ? " OBLIGATORIO: si en la narración hay un competidor nombrado o un precio de otro proveedor, esta lista NO puede quedar vacía."
        : "";
    properties[`bloques_${m.key}`] = {
      type: "array",
      description:
        `${m.nombre}. ${m.descripcion ?? ""} Añade un elemento por cada asunto distinto de este tipo que aparezca en la narración ` +
        "(dos ofertas distintas = dos elementos). Deja la lista vacía si no hay ningún dato real de este tipo." + extra,
      items: esquemaBloque(m),
    };
  }
  return {
    type: "object",
    properties,
    required: ["resultado_visita", ...motivos.map((m) => `bloques_${m.key}`)],
    additionalProperties: false,
  };
}

/** System prompt: FIJO entre llamadas (prompt caching). Nada variable aquí. */
function sistemaExtraccion(motivos: MotivoDef[]) {
  const catalogo = motivos
    .map((m) => `- ${m.key} (${m.nombre}): ${m.descripcion ?? ""}`)
    .join("\n");
  return (
    "Eres el asistente de un comercial de recambios de automoción. Recibes la transcripción de una nota de voz grabada tras una " +
    "visita a un cliente y la repartes en bloques, uno por cada asunto tratado.\n\n" +
    `MOTIVOS DISPONIBLES:\n${catalogo}\n\n` +
    "REGLAS DE SELECCIÓN DE MOTIVO:\n" +
    "- revision_seguimiento solo si se revisa algo concreto de una visita anterior (una oferta ya pasada, un compromiso previo). " +
    "Si es una oferta nueva, es promocion.\n" +
    "- seguimiento es el cajón de último recurso: úsalo solo si no encaja en ningún otro motivo.\n" +
    "- COMPETENCIA, REGLA IMPERATIVA: si en la narración aparece un competidor nombrado (Euro Recambios, Recanor, etc.) o un precio " +
    "de otro proveedor, creas SIEMPRE un bloque competencia con competidor, precio_rimosa, precio_competencia y resultado_venta. " +
    "Va ADEMÁS del bloque de seguimiento o de revisión que corresponda: no son excluyentes, la misma situación genera los dos. " +
    "Los precios de la comparativa nunca se quedan solo dentro de un texto libre como motivo_perdida; van a sus campos numéricos " +
    "del bloque competencia.\n" +
    "  Ejemplo: «se los compra a Euro Recambios a 120 cuando nosotros lo tenemos a 142, me ha enseñado el albarán» => " +
    "un bloque revision_seguimiento con resultado 'Venta perdida' Y un bloque competencia con competidor=Euro Recambios, " +
    "precio_competencia=120, precio_rimosa=142, resultado_venta el que corresponda.\n" +
    "- Un motivo solo se instancia si hay al menos un dato real en la narración. Nunca crees un bloque vacío por si acaso.\n" +
    "- Si el mismo motivo aparece dos veces con contenido distinto, devuelve dos elementos en su lista, nunca uno con los datos mezclados.\n\n" +
    "REGLAS DE CONTENIDO:\n" +
    "- El cliente YA viene dado por la aplicación: no lo deduzcas de la transcripción ni lo devuelvas.\n" +
    "- No inventes: si la narración no dice nada de un campo, ese campo va a null.\n" +
    "- En los campos con lista de opciones, devuelve SIEMPRE uno de los valores exactos de la lista, nunca texto libre.\n" +
    "- Las referencias de producto se devuelven tal cual las dice el comercial; no las corrijas ni las aproximes, y nunca " +
    "conviertas una palabra suelta en referencia.\n" +
    "- Redacta los textos en español, en tercera persona, breve y concreto.\n" +
    "- Por cada campo relleno añade una evidencia con un fragmento literal de 5 a 10 palabras y tu nivel de confianza."
  );
}

// ---------------------------------------------------------------- gateway

async function chatJson(key: string, sistema: string, usuario: string, nombre: string, schema: unknown) {
  const cuerpo = (conTemperatura: boolean) =>
    JSON.stringify({
      model: MODELO_EXTRACCION,
      reasoning_effort: "none",
      ...(conTemperatura ? { temperature: 0 } : {}),
      messages: [
        // El system va SIEMPRE primero e idéntico: es lo que permite el prompt caching.
        { role: "system", content: sistema },
        { role: "user", content: usuario },
      ],
      response_format: { type: "json_schema", json_schema: { name: nombre, strict: true, schema } },
    });

  const llamar = (conTemperatura: boolean) =>
    fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: cuerpo(conTemperatura),
    });

  let res = await llamar(true);
  if (res.status === 400) {
    // Algunos modelos rechazan temperature: con el esquema estricto la salida ya está acotada.
    const detalle = await res.text();
    console.warn(`Reintento sin temperature: ${detalle.slice(0, 300)}`);
    res = await llamar(false);
  }
  if (!res.ok) {
    const details = await res.text();
    console.error(`Extracción falló [${res.status}]: ${details}`);
    return { ok: false as const, status: res.status, details };
  }
  const body = await res.json();
  try {
    return { ok: true as const, data: JSON.parse(body.choices?.[0]?.message?.content ?? "{}") };
  } catch (_e) {
    console.error("Respuesta del modelo no es JSON válido");
    return { ok: false as const, status: 502, details: "El modelo no ha devuelto un informe válido." };
  }
}

// ---------------------------------------------------------------- acciones

async function transcribir(key: string, audio: File) {
  if (audio.size < 2048) {
    return json({ error: "La grabación está vacía. Vuelve a grabar hablando más cerca del micrófono." }, 400);
  }
  const upstream = new FormData();
  upstream.append("model", MODELO_TRANSCRIPCION);
  upstream.append("file", audio, "nota.wav");
  upstream.append("language", "es");
  upstream.append("prompt", await vocabularioTranscripcion());

  const tr = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: upstream,
  });
  if (!tr.ok) {
    const details = await tr.text();
    console.error(`Transcripción falló [${tr.status}]: ${details}`);
    return json({ error: mensajeError(tr.status, "No se ha podido transcribir el audio"), details }, tr.status);
  }
  const { text } = await tr.json();
  if (!String(text ?? "").trim()) {
    return json({ error: "No se ha detectado voz en la grabación. Inténtalo de nuevo." }, 400);
  }
  return json({ transcripcion: String(text) });
}

interface BloqueSalida {
  motivo_key: string;
  campos: Record<string, string>;
  campos_meta: Record<string, { cita: string; confianza: string }>;
}

/** Recorta la cita a 12 palabras por si el modelo devuelve la frase entera. */
const recortarCita = (cita: string) => {
  const palabras = String(cita ?? "").trim().split(/\s+/).filter(Boolean);
  return palabras.length <= 12 ? palabras.join(" ") : palabras.slice(0, 12).join(" ") + "…";
};

/** Una referencia de producto de verdad lleva dígitos y no es una palabra suelta. */
const referenciaPlausible = (v: string) => v.trim().length >= 3 && /\d/.test(v);

/** Normaliza y valida el valor devuelto para un campo. Devuelve null si no vale. */
function valorValido(c: CampoDef, v: unknown): string | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const s = String(v).trim();
  if (c.opciones.length && c.tipo === "select" && !c.opciones.includes(s)) return null;
  if (c.tipo === "referencia" && !referenciaPlausible(s)) return null;
  return s;
}

async function extraer(key: string, transcripcion: string, clienteNombre: string) {
  const { motivos } = await cargarCatalogo();
  const schema = esquemaExtraccion(motivos);

  const res = await chatJson(
    key,
    sistemaExtraccion(motivos),
    // Lo variable va SIEMPRE después del system, nunca dentro de él.
    (clienteNombre ? `Cliente (ya seleccionado en la aplicación, no lo deduzcas): ${clienteNombre}\n\n` : "") +
      `Transcripción de la nota de voz:\n"""\n${transcripcion}\n"""`,
    "informe_visita",
    schema,
  );
  if (!res.ok) {
    return json(
      { transcripcion, bloques: [], error: mensajeError(res.status, "No se ha podido analizar la nota de voz."), details: res.details },
      res.status,
    );
  }

  const salida = res.data as Record<string, unknown>;
  const bloques: BloqueSalida[] = [];

  for (const m of motivos) {
    const lista = salida[`bloques_${m.key}`];
    if (!Array.isArray(lista)) continue;
    for (const item of lista) {
      const crudos = (item?.campos ?? {}) as Record<string, unknown>;
      const campos: Record<string, string> = {};
      for (const c of m.campos) {
        const v = valorValido(c, crudos[c.campo_key]);
        if (v !== null) campos[c.campo_key] = v;
      }
      if (!Object.keys(campos).length) continue; // nada real: no se instancia el bloque

      const campos_meta: BloqueSalida["campos_meta"] = {};
      for (const e of (item?.evidencias ?? []) as { campo?: string; cita?: string; confianza?: string }[]) {
        if (!e?.campo || !(e.campo in campos)) continue;
        campos_meta[e.campo] = {
          cita: recortarCita(String(e.cita ?? "")),
          confianza: ["alta", "media", "baja"].includes(String(e.confianza)) ? String(e.confianza) : "media",
        };
      }
      bloques.push({ motivo_key: m.key, campos, campos_meta });
    }
  }

  const resultado = String(salida.resultado_visita ?? "efectiva");
  return json({
    transcripcion,
    resultado_visita: ["efectiva", "cliente_ausente", "cerrado", "sin_acceso"].includes(resultado) ? resultado : "efectiva",
    bloques,
    analisis_modelo: MODELO_EXTRACCION,
    analisis_prompt_version: VERSION_PROMPT,
  });
}

/** Segunda tanda: solo los campos que faltan para que el director dé la visita por válida. */
async function repreguntar(key: string, transcripcion: string, motivoKey: string, claves: string[]) {
  const { motivos } = await cargarCatalogo();
  const motivo = motivos.find((m) => m.key === motivoKey);
  if (!motivo) return json({ error: "Motivo desconocido" }, 400);

  const campos = motivo.campos.filter((c) => claves.includes(c.campo_key));
  if (!campos.length) return json({ campos: {}, campos_meta: {} });

  const schema = {
    type: "object",
    properties: {
      campos: esquemaCampos(campos),
      evidencias: (esquemaBloque({ ...motivo, campos }) as { properties: Record<string, unknown> }).properties.evidencias,
    },
    required: ["campos", "evidencias"],
    additionalProperties: false,
  };

  const res = await chatJson(
    key,
    "Eres el asistente de un comercial de recambios. Recibes su respuesta hablada a unas preguntas concretas sobre una visita " +
      "y rellenas solo esos campos. No inventes: lo que no diga, va a null. En los campos con lista, usa siempre un valor exacto " +
      "de la lista. Por cada campo relleno añade un fragmento literal de 5 a 10 palabras que lo justifique.",
    `Motivo: ${motivo.nombre}\n\nRespuesta del comercial:\n"""\n${transcripcion}\n"""`,
    "campos_pendientes",
    schema,
  );
  if (!res.ok) {
    return json({ transcripcion, error: mensajeError(res.status, "No se ha podido analizar la respuesta."), details: res.details }, res.status);
  }

  const salida = res.data as { campos?: Record<string, unknown>; evidencias?: { campo?: string; cita?: string; confianza?: string }[] };
  const valores: Record<string, string> = {};
  for (const c of campos) {
    const v = valorValido(c, salida.campos?.[c.campo_key]);
    if (v !== null) valores[c.campo_key] = v;
  }
  const meta: Record<string, { cita: string; confianza: string }> = {};
  for (const e of salida.evidencias ?? []) {
    if (!e?.campo || !(e.campo in valores)) continue;
    meta[e.campo] = {
      cita: recortarCita(String(e.cita ?? "")),
      confianza: ["alta", "media", "baja"].includes(String(e.confianza)) ? String(e.confianza) : "media",
    };
  }
  return json({ transcripcion, campos: valores, campos_meta: meta });
}

// ---------------------------------------------------------------- handler

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "Falta la configuración de IA" }, 500);

  try {
    const tipo = req.headers.get("content-type") ?? "";

    // 1) Audio -> transcripción y nada más: la pantalla la pinta enseguida.
    if (tipo.includes("multipart/form-data")) {
      const form = await req.formData();
      const audio = form.get("audio");
      if (!(audio instanceof File)) return json({ error: "No se ha recibido audio" }, 400);
      return await transcribir(key, audio);
    }

    // 2) Transcripción -> bloques (o respuesta a la repregunta). Reanalizar entra por aquí:
    //    llega la transcripción ya guardada y NO se vuelve a transcribir.
    const body = await req.json();
    const transcripcion = String(body?.transcripcion ?? "").trim();
    if (!transcripcion) return json({ error: "No hay transcripción que analizar" }, 400);

    if (body?.accion === "repreguntar") {
      return await repreguntar(key, transcripcion, String(body?.motivo_key ?? ""), (body?.campos ?? []) as string[]);
    }
    return await extraer(key, transcripcion, String(body?.cliente_nombre ?? ""));
  } catch (err) {
    console.error("visita-voz error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
