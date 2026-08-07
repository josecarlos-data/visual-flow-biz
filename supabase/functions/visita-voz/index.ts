import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders } from "../_shared/cors.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
/** Extracción: rellenar campos con instrucciones explícitas, sin razonamiento (latencia < 10 s). */
const MODELO_EXTRACCION = "openai/gpt-5.6-sol";
const MODELO_TRANSCRIPCION = "openai/gpt-4o-transcribe";

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

async function cargarCatalogo(): Promise<MotivoDef[]> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [mRes, cRes, catRes] = await Promise.all([
    admin.from("motivos_visita").select("key, nombre, descripcion, sort_order, is_active").eq("is_active", true).order("sort_order"),
    admin.from("motivo_campos").select("*").order("sort_order"),
    admin.from("catalogos_opciones").select("clave, valor, orden").eq("is_active", true).order("orden"),
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

  return ((mRes.data ?? []) as { key: string; nombre: string; descripcion: string | null }[])
    .map((m) => ({ ...m, campos: campos.filter((c) => c.motivo_key === m.key) }))
    .filter((m) => m.campos.length > 0);
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
      "Devuelve la referencia TAL CUAL la dice el comercial, sin corregirla ni completarla. Si no menciona ninguna, null.",
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

function esquemaBloque(m: MotivoDef) {
  return {
    type: "object",
    properties: {
      campos: esquemaCampos(m.campos),
      evidencias: {
        type: "array",
        description:
          "Una entrada por cada campo que hayas rellenado (no para los que dejas a null), con la frase literal de la transcripción que lo justifica.",
        items: {
          type: "object",
          properties: {
            campo: { type: "string", enum: m.campos.map((c) => c.campo_key) },
            cita: { type: "string", description: "Frase literal de la transcripción que justifica el valor." },
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
    properties[`bloques_${m.key}`] = {
      type: "array",
      description:
        `${m.nombre}. ${m.descripcion ?? ""} Añade un elemento por cada asunto distinto de este tipo que aparezca en la narración ` +
        "(dos ofertas distintas = dos elementos). Deja la lista vacía si no hay ningún dato real de este tipo.",
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
    "- competencia exige que se mencione un competidor o un precio ajeno.\n" +
    "- Un motivo solo se instancia si hay al menos un dato real en la narración. Nunca crees un bloque vacío por si acaso.\n" +
    "- Si el mismo motivo aparece dos veces con contenido distinto, devuelve dos elementos en su lista, nunca uno con los datos mezclados.\n\n" +
    "REGLAS DE CONTENIDO:\n" +
    "- No inventes: si la narración no dice nada de un campo, ese campo va a null.\n" +
    "- En los campos con lista de opciones, devuelve SIEMPRE uno de los valores exactos de la lista, nunca texto libre.\n" +
    "- Las referencias de producto se devuelven tal cual las dice el comercial; no las corrijas ni las aproximes.\n" +
    "- Redacta los textos en español, en tercera persona, breve y concreto.\n" +
    "- Por cada campo relleno añade una evidencia con la cita literal de la transcripción y tu nivel de confianza."
  );
}

// ---------------------------------------------------------------- gateway

async function chatJson(key: string, sistema: string, usuario: string, nombre: string, schema: unknown) {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELO_EXTRACCION,
      reasoning_effort: "none",
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: usuario },
      ],
      response_format: { type: "json_schema", json_schema: { name: nombre, strict: true, schema } },
    }),
  });
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

async function extraer(key: string, transcripcion: string, clienteNombre: string) {
  const motivos = await cargarCatalogo();
  const schema = esquemaExtraccion(motivos);

  const res = await chatJson(
    key,
    sistemaExtraccion(motivos),
    (clienteNombre ? `Cliente: ${clienteNombre}\n\n` : "") +
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
        const v = crudos[c.campo_key];
        if (v === null || v === undefined || String(v).trim() === "") continue;
        // Un select nunca puede salirse de su lista.
        if (c.opciones.length && c.tipo === "select" && !c.opciones.includes(String(v))) continue;
        campos[c.campo_key] = String(v).trim();
      }
      if (!Object.keys(campos).length) continue; // nada real: no se instancia el bloque

      const campos_meta: BloqueSalida["campos_meta"] = {};
      for (const e of (item?.evidencias ?? []) as { campo?: string; cita?: string; confianza?: string }[]) {
        if (!e?.campo || !(e.campo in campos)) continue;
        campos_meta[e.campo] = {
          cita: String(e.cita ?? ""),
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
  });
}

/** Segunda tanda: solo los campos que faltan para que el director dé la visita por válida. */
async function repreguntar(key: string, transcripcion: string, motivoKey: string, claves: string[]) {
  const motivos = await cargarCatalogo();
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
      "y rellenas solo esos campos. No inventes: lo que no diga, va a null. En los campos con lista, usa siempre un valor exacto de la lista.",
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
    const v = salida.campos?.[c.campo_key];
    if (v === null || v === undefined || String(v).trim() === "") continue;
    if (c.opciones.length && c.tipo === "select" && !c.opciones.includes(String(v))) continue;
    valores[c.campo_key] = String(v).trim();
  }
  const meta: Record<string, { cita: string; confianza: string }> = {};
  for (const e of salida.evidencias ?? []) {
    if (!e?.campo || !(e.campo in valores)) continue;
    meta[e.campo] = {
      cita: String(e.cita ?? ""),
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

    // 2) Transcripción -> bloques (o respuesta a la repregunta).
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
