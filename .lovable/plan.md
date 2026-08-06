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

## 6. Fallback: nunca perder la narración

- La transcripción se devuelve al cliente y se guarda en `visitas.transcripcion`
  **antes** de intentar la extracción.
- Si la extracción falla (error del gateway, 429, 402, JSON inválido, motivo
  desconocido), se devuelve `{ transcripcion, bloques: [], error }`: la pantalla
  muestra la transcripción íntegra, un aviso claro y el formulario manual de siempre.
- Bloques con `motivo_key` no reconocido o sin ningún campo relleno se descartan en
  el servidor antes de responder.

## 7. Cambios técnicos

- `supabase/functions/visita-voz/index.ts`: nuevo modo multibloque. Recibe el catálogo
  completo (motivos + campos + catálogos resueltos) o lo lee él mismo con service role;
  construye el esquema, llama a la Responses API en streaming, valida y limpia la salida.
  Se mantiene el modo actual por bloque para no romper nada mientras se prueba.
- `src/pages/NuevaVisita.tsx`: grabadora principal a nivel de visita, con pantalla de
  bloques propuestos (añadir/eliminar/cambiar motivo) y avisos de referencias no
  resueltas; `resultado_visita` precargado y editable.
- `src/hooks/useCrm.ts`: exponer el catálogo completo (11 motivos y sus campos) para
  poder enviarlo en una sola llamada.
- `src/lib/motivoCampos.ts`: helper compartido para decidir qué campos entran en el
  esquema (activo, no sistema, no adjunto, no campaña).

Sin cambios de esquema de base de datos en esta fase.

## 8. Verificación

- Una narración con dos ofertas distintas produce dos bloques `promocion`.
- Una narración de charla genérica no produce bloques de `competencia` ni
  `revision_seguimiento`.
- Un select nunca queda con un valor fuera de su lista.
- Una referencia inexistente deja el campo vacío y muestra aviso.
- Forzando un fallo de la extracción, la transcripción sigue visible y guardable.
