import { corsHeaders } from "../_shared/cors.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

interface CampoDef {
  campo_key: string;
  label: string;
  ayuda?: string | null;
  tipo: string;
  is_required: boolean;
  opciones?: string[];
}

function buildSchema(campos: CampoDef[]) {
  const properties: Record<string, unknown> = {};
  for (const c of campos) {
    const opciones = Array.isArray(c.opciones) ? c.opciones.filter(Boolean) : [];
    const listado = opciones.length ? ` Elige solo entre estas opciones: ${opciones.join(" / ")}.` : "";
    properties[c.campo_key] = {
      type: c.tipo === "numero" ? ["number", "null"] : ["string", "null"],
      description:
        `${c.label}${c.ayuda ? ` — ${c.ayuda}` : ""}.${listado}` +
        (c.tipo === "multiselect" ? " Si son varias, sepáralas con ' | '." : "") +
        (c.tipo === "booleano" ? " Responde 'si' o 'no'." : "") +
        " Devuelve null si la nota de voz no aporta información sobre este punto.",
    };
  }
  return {
    type: "object",
    properties,
    required: campos.map((c) => c.campo_key),
    additionalProperties: false,
  };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "Falta la configuración de IA" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const camposRaw = form.get("campos");
    const motivoNombre = String(form.get("motivo_nombre") ?? "visita comercial");
    const clienteNombre = String(form.get("cliente_nombre") ?? "");
    const transcripcionPrevia = String(form.get("transcripcion") ?? "");

    const campos: CampoDef[] = camposRaw ? JSON.parse(String(camposRaw)) : [];
    if (campos.length === 0) {
      return new Response(JSON.stringify({ error: "No hay campos definidos para este motivo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 1. Transcripción ---
    let transcripcion = transcripcionPrevia;

    if (!transcripcion) {
      if (!(audio instanceof File)) {
        return new Response(JSON.stringify({ error: "No se ha recibido audio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (audio.size < 2048) {
        return new Response(
          JSON.stringify({ error: "La grabación está vacía. Vuelve a grabar hablando más cerca del micrófono." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const upstream = new FormData();
      upstream.append("model", "openai/gpt-4o-transcribe");
      upstream.append("file", audio, "nota.wav");
      upstream.append("language", "es");

      const tr = await fetch(`${GATEWAY}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: upstream,
      });

      if (!tr.ok) {
        const body = await tr.text();
        console.error(`Transcripción falló [${tr.status}]: ${body}`);
        return new Response(
          JSON.stringify({ error: "No se ha podido transcribir el audio", status: tr.status, details: body }),
          { status: tr.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const trJson = await tr.json();
      transcripcion = trJson.text ?? "";
    }

    if (!transcripcion.trim()) {
      return new Response(
        JSON.stringify({ error: "No se ha detectado voz en la grabación. Inténtalo de nuevo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- 2. Extracción estructurada ---
    const listado = campos
      .map((c) => `- ${c.campo_key} (${c.label})${c.is_required ? " [OBLIGATORIO]" : ""}: ${c.ayuda ?? ""}`)
      .join("\n");

    const chat = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          {
            role: "system",
            content:
              "Eres el asistente de un comercial de recambios de automoción. Recibes la transcripción de una nota de voz grabada tras una visita a un cliente y debes repartir esa información en los campos del informe. " +
              "Redacta en español, en tercera persona, de forma breve, concreta y profesional. No inventes datos: si la nota no dice nada sobre un campo, devuelve null en ese campo. " +
              "Corrige errores evidentes de transcripción de nombres de marcas o referencias cuando el contexto lo permita.",
          },
          {
            role: "user",
            content:
              `Motivo de la visita: ${motivoNombre}\n` +
              (clienteNombre ? `Cliente: ${clienteNombre}\n` : "") +
              `\nCampos del informe:\n${listado}\n\nTranscripción de la nota de voz:\n"""\n${transcripcion}\n"""`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "informe_visita", strict: true, schema: buildSchema(campos) },
        },
      }),
    });

    if (!chat.ok) {
      const body = await chat.text();
      console.error(`Extracción falló [${chat.status}]: ${body}`);
      const msg =
        chat.status === 429
          ? "Demasiadas peticiones a la IA. Espera unos segundos e inténtalo de nuevo."
          : chat.status === 402
          ? "Se han agotado los créditos de IA del espacio de trabajo."
          : "No se ha podido analizar la nota de voz.";
      return new Response(JSON.stringify({ error: msg, transcripcion, status: chat.status, details: body }), {
        status: chat.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatJson = await chat.json();
    let valores: Record<string, unknown> = {};
    try {
      valores = JSON.parse(chatJson.choices?.[0]?.message?.content ?? "{}");
    } catch (_e) {
      valores = {};
    }

    return new Response(JSON.stringify({ transcripcion, campos: valores }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("visita-voz error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
