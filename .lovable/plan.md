# FASE 4 — Nota de voz multibloque

Hoy la nota de voz es por bloque: el comercial elige el motivo, graba y la IA rellena
solo ese bloque. En la FASE 4 se graba **una sola narración de la visita** y el modelo
decide qué motivos hay, crea un bloque por cada uno y reparte los datos.

No se toca ninguna otra fase.

## 1. Flujo

```text
Comercial graba una vez (o escribe la narración)
        v
Transcripción -> se guarda SIEMPRE en visitas.transcripcion
        v
Extracción estructurada (1 llamada) -> resultado_visita + N bloques
        v
Pantalla de revisión: bloques propuestos, campos rellenos, avisos
        v
El comercial edita/borra/añade y guarda
```

Nada se persiste hasta que el comercial guarda. Los bloques propuestos son un
borrador editable, igual que hoy.

## 2. Criterio de selección de motivo

El prompt del sistema incluye los 11 motivos con su `nombre` y su `descripcion`
(la escrita en la FASE 3, que ya contiene el criterio de validez del director),
más estas reglas explícitas de desempate:

- `revision_seguimiento` solo si se revisa algo concreto de una visita anterior
  (una oferta ya pasada, un compromiso previo). Si es una oferta nueva, es `promocion`.
- `seguimiento` es el cajón de último recurso: solo si no encaja en ningún otro motivo.
- `competencia` exige que se mencione un competidor o un precio ajeno.
- Un motivo solo se instancia si hay **al menos un dato real** en la narración.
  Prohibido crear bloques vacíos "por si acaso".
- Si un mismo motivo aparece dos veces con contenido distinto (dos ofertas, dos
  comparativas de precio), se devuelven **dos bloques** de ese motivo, nunca uno
  con los datos mezclados. `visita_bloques` no tiene restricción única, así que se
  insertan tal cual con `orden` correlativo.

## 3. Esquema enviado al modelo

Un único `json_schema` estricto:

- `resultado_visita`: enum `efectiva` / `cliente_ausente` / `cerrado` / `sin_acceso`,
  propuesto a partir de la narración y editable por el comercial. Si no es `efectiva`,
  no se proponen bloques.
- `bloques`: lista de objetos con
  - `motivo_key`: enum con los 11 motivos activos,
  - `campos`: objeto con **todos** los campos candidatos (clave `motivo.campo`),
    todos nullable; el modelo rellena solo los del motivo del bloque y deja el resto
    a null. La aplicación descarta lo que no pertenezca a ese motivo.
  - `campos_meta`: por cada campo que el modelo rellena, `{ "cita": "...",
    "confianza": "alta|media|baja" }`. La cita es literal de la transcripción y es
    lo que justifica el valor; la confianza la declara el modelo. Si un campo va a
    null, no lleva meta.

`campos` guarda solo valores planos; la trazabilidad vive entera en `campos_meta`
(columna creada en la FASE 2 y hoy vacía). Al guardar, cada bloque persiste su
`campos_meta` filtrado a los campos del motivo. En la pantalla de revisión los
campos de confianza **baja** se resaltan y, al pasar por encima (o tocar, en
móvil), se muestra la frase de la transcripción que los justifica; así el
comercial valida sin releerse toda la narración.


`description` de cada campo = su texto de `motivo_campos.ayuda` (los 80 de la FASE 3),
más el enum literal cuando el campo es `select`/`multiselect`. Los selects se envían
como enum real, de modo que el modelo **no puede** devolver texto libre; los
multiselect se serializan con `" | "`.

**Campos excluidos del esquema**: `is_active = false`, `visibilidad = 'sistema'`,
tipo `adjunto` y tipo `referencia_campana`. Con el catálogo actual quedan **74 campos**
sobre 11 motivos.

## 4. Referencias de producto

Los campos de tipo `referencia` se piden como texto tal cual lo dijo el comercial
("ref 04154 de Febi"), sin normalizar. La aplicación lo resuelve contra `productos`
con el RPC `buscar_productos`:

- coincidencia exacta -> se rellena el campo,
- sin coincidencia exacta -> el campo se deja **vacío**, se muestra un aviso
  ("no he encontrado esa referencia: 04154") y el buscador ya existente queda
  abierto para que el comercial la elija.

El modelo nunca inventa ni aproxima una referencia.

## 5. Coste y latencia

- Transcripción: `openai/gpt-4o-transcribe` (la que ya usa la función).
- Extracción: `openai/gpt-5.6-sol` vía la Responses API del gateway, en streaming
  consumido dentro de la función (una nota larga con razonamiento supera el tiempo
  máximo de una petición sin streaming).
- **Catálogo completo en una sola llamada**, no filtrado: el modelo necesita ver los
  11 motivos para elegir. Los 74 campos con sus ayudas ocupan del orden de 6–8k tokens
  de entrada; la salida ronda 300–800 tokens.
- Estimación por visita: ~1 min de audio + una extracción. Del orden de **1–3 céntimos
  de crédito por visita**, 15–40 s de espera. Si en pruebas la latencia molesta, la
  alternativa (dos llamadas: primero elegir motivos, luego extraer solo esos campos)
  queda documentada pero no se implementa ahora.

## 5. Chuleta previa (antes de grabar)

Pantalla ligera y **no bloqueante** antes de la grabación: tarjetas plegables con
los 11 motivos, su `descripcion` y sus puntos clave (los campos con
`requerido_validacion`, que es justo lo que el director exige). Sirve de recordatorio
para que el comercial no se deje nada; no obliga a elegir motivo ni cambia el flujo.
Se puede saltar con un botón y queda accesible durante la grabación.

## 6. Repregunta de campos que faltan

Tras la extracción, la aplicación calcula por bloque los campos con
`requerido_validacion` vacíos. Si hay alguno:

- se muestra **una sola tanda** con esos campos concretos ("¿Qué precio te dio de
  Febi?", "¿Qué día se comprometió a pagar?"), agrupados por bloque;
- el comercial responde por **voz** (una segunda grabación corta que se manda a la
  misma función, con el esquema reducido solo a esos campos) o **por texto** en el
  propio formulario;
- si no contesta o la salta, el bloque se guarda igual con `completo = false` y el
  aviso ámbar de siempre. Nunca se bloquea el guardado.

La repregunta se hace una vez; si tras responder siguen faltando campos, se guarda
con `completo = false` sin volver a insistir.

## 7. Modelo, coste y latencia

- Transcripción: `openai/gpt-4o-transcribe` (la que ya usa la función).
- Extracción: **antes de comprometerse** se prueban dos configuraciones sobre las
  **mismas 3 narraciones reales** (una simple de un motivo, una de dos ofertas, una
  larga con tres motivos y referencias):
  - **A — rápida, sin razonamiento**: `openai/gpt-5.6-sol` en chat completions con
    `reasoning_effort: "none"` y `json_schema` estricto. Es una tarea de rellenar
    campos con instrucciones explícitas, no de razonar; es la candidata por defecto.
  - **B — con razonamiento**: `openai/gpt-5.6-sol` por la Responses API en streaming.
- Se mide en cada una: motivos acertados, campos correctos, selects fuera de enum,
  **latencia** (p50 y peor caso) y coste por visita, y se te entrega la tabla antes
  de fijar la configuración.
- **Objetivo: menos de 10 s** de extracción. Si A cumple, se queda A y no se usa
  streaming ni razonamiento. B solo se adopta si A falla en calidad de forma clara.
- Si A cumple calidad pero no los 10 s, la palanca es el tamaño del prompt: se pasa
  a dos llamadas (primero elegir motivos con solo las 11 descripciones, luego extraer
  con los campos de esos motivos), que recorta el prompt de ~74 campos a ~10–20.
- **De partida se envía el catálogo completo** en una sola llamada: el modelo necesita
  ver los 11 motivos para elegir. Son del orden de 6–8k tokens de entrada y 300–800
  de salida; coste estimado de **1–3 céntimos de crédito por visita**.

## 8. Fallback: nunca perder la narración

- La transcripción se devuelve al cliente y se guarda en `visitas.transcripcion`
  **antes** de intentar la extracción.
- Si la extracción falla (error del gateway, 429, 402, JSON inválido, motivo
  desconocido), se devuelve `{ transcripcion, bloques: [], error }`: la pantalla
  muestra la transcripción íntegra, un aviso claro y el formulario manual de siempre.
- Bloques con `motivo_key` no reconocido o sin ningún campo relleno se descartan en
  el servidor antes de responder.

## 9. Cambios técnicos

- `supabase/functions/visita-voz/index.ts`: nuevo modo multibloque (esquema con
  `resultado_visita`, `bloques`, `campos` y `campos_meta`), más un modo reducido para
  la repregunta. Se mantiene el modo actual por bloque mientras se prueba.
- `src/pages/NuevaVisita.tsx`: chuleta previa, grabadora a nivel de visita, bloques
  propuestos editables, resaltado de confianza baja con la cita, tanda de repregunta
  y `resultado_visita` precargado.
- `src/hooks/useCrm.ts`: catálogo completo de motivos y campos en una sola llamada;
  `crearBloques` pasa a persistir también `campos_meta` y `completo`.
- `src/lib/motivoCampos.ts`: helper para decidir qué campos entran en el esquema
  (activo, no sistema, no adjunto, no campaña) y cuáles disparan repregunta.
- `src/pages/RevisionVisitas.tsx` y `ClienteDetalle.tsx`: mostrar la cita de
  `campos_meta` al revisar.

Sin cambios de esquema de base de datos en esta fase.

## 10. Verificación

- Una narración con dos ofertas distintas produce dos bloques `promocion`.
- Una narración de charla genérica no produce bloques de `competencia` ni
  `revision_seguimiento`.
- Un select nunca queda con un valor fuera de su lista.
- Una referencia inexistente deja el campo vacío y muestra aviso.
- Forzando un fallo de la extracción, la transcripción sigue visible y guardable.
- **`campos_meta` se guarda con cita y confianza** para todos los campos rellenos:
  `SELECT count(*) FROM visita_bloques WHERE campos <> '{}' AND campos_meta = '{}'` → 0
  en las visitas creadas con voz.
- **Un bloque al que le falte un campo `requerido_validacion` dispara la repregunta**;
  si se salta, se guarda con `completo = false`.
- Tabla comparativa A vs B sobre las 3 narraciones, con la extracción elegida por
  debajo de 10 s.

