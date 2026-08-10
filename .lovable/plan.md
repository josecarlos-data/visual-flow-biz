# Reproceso del histórico a bloques — plan y estimación (no se ejecuta nada)

## Estado verificado ahora mismo

- Visitas con `observaciones` no vacía: **18.017** (tu cifra de 18.031 es prácticamente exacta).
- `visita_bloques`: 21.493 filas, de las cuales **21.484 con `campos = '{}'`** (una por visita histórica).
- De esos bloques vacíos: **1.297 llevan `nota_revision`** y **10.456 tienen `validacion` distinta de
  `pendiente`** (263 `NO CORRECTO`). Es el resultado de la 6a y no se puede perder.
- Longitud media de la observación histórica: **121 caracteres** (máx. 1.248). Son textos muy cortos.
- `reprocesar_historico_a_bloques()` hoy **no llama a la IA**: solo marca
  `campos_meta._reprocesar = true` en hasta `_limite` bloques. Es un marcador de cola, nada más.
- Coincidencias por palabra clave en esos textos: ~4.808 mencionan competencia/precio y ~6.976
  promoción/oferta/campaña. Sirve para muestrear la prueba previa.

## 1. Coste y latencia estimados

Tu cifra es correcta en orden de magnitud, con un matiz importante a la baja.

- Cada llamada envía un system prompt fijo de ~12.000 tokens (las 11 plantillas + catálogos). El texto
  histórico añade solo ~40 tokens de media, así que **el coste por visita es casi el mismo que el de las
  narraciones del banco de pruebas**: ~0,012 créditos.
- Coste bruto: 18.017 × 0,012 ≈ **216 créditos**. Confirmado.
- Matiz: el system es idéntico carácter por carácter en todas las llamadas, así que con caché de prompt
  la parte cacheada se factura más barata. En la práctica el rango realista es **130–220 créditos**.
  El número exacto sale de la prueba de 30, que se extrapola por tokens reales facturados.
- Latencia: luna tardó 4,1–6,1 s con narraciones largas; con 121 caracteres se espera **2–4 s**.
  Con concurrencia 4–6 llamadas simultáneas: **2,5–4 horas** de reloj para las 18.017.
  En serie serían más de 15 horas, por eso no puede ser una sola pasada.

## 2. Cómo se procesa

Cola en base de datos + worker por lotes, invocable tantas veces como haga falta.

- Se añaden a `visita_bloques` columnas de control: `reproceso_estado`
  (`pendiente`/`en_curso`/`hecho`/`error`), `reproceso_intentos`, `reproceso_error`, `reproceso_en`.
- `reprocesar_historico_a_bloques()` pasa a **encolar**: marca `reproceso_estado='pendiente'` en los
  bloques vacíos cuya visita tiene texto. Idempotente: no reencola lo que ya está `hecho`.
- Nueva función de borde `visita-reproceso` (solo admin) que en cada invocación:
  1. toma un lote de **50** bloques `pendiente` con `SELECT ... FOR UPDATE SKIP LOCKED` y los pone
     `en_curso` — dos ejecuciones simultáneas nunca cogen el mismo bloque;
  2. lanza las llamadas a la pasarela con **concurrencia 5** y reutiliza el mismo prompt y el mismo
     validador de campos que la voz en directo (`_shared/visita-voz-prompt.ts`);
  3. ante `429`/`402`/error de red: espera exponencial (1 s, 4 s, 15 s) y hasta **3 intentos**; si
     agota, deja el bloque en `error` con el motivo y **sigue con el resto**;
  4. ante `402` (créditos agotados) aborta el lote entero y lo devuelve a `pendiente`: no se quema
     saldo dando vueltas.
  5. devuelve un resumen `{procesados, ok, error, restantes}`.
- Reanudable por construcción: si se corta a mitad, los `en_curso` con más de 10 minutos vuelven a
  `pendiente` al inicio de la siguiente invocación.
- Disparo desde una pantalla de administración con un botón "procesar siguiente lote" y un contador,
  que puede quedarse encadenando lotes mientras esté abierta. Sin trabajos de fondo invisibles.
- El trigger agregado `trg_visita_bloques_agregado` se deja activo: el reproceso no toca `validacion`.

## 3. Qué pasa con los bloques que ya existen

Se **rellenan**, no se sustituyen. Regla concreta por visita:

- El bloque histórico existente es el **bloque 0** y no se borra nunca. Conserva su `id`,
  `validacion`, `nota_revision`, `revisado_por` y `revisado_en` intactos: el reproceso solo escribe en
  `campos`, `campos_meta`, `motivo_key` (si estaba nulo) y las columnas nuevas de control.
- Si la IA devuelve **un** bloque, sus campos van al bloque 0.
- Si devuelve **varios** (p. ej. tres comparativas de competencia), el primero va al bloque 0 y el
  resto se **insertan como bloques nuevos** de la misma visita, heredando `validacion` y
  `nota_revision` del bloque 0 para no degradar lo revisado por el director.
- Si no devuelve nada útil, el bloque 0 se queda como está y se marca `hecho` con
  `campos_meta._sin_extraccion = true`. No se pierde el texto: `observaciones` sigue en la visita.
- Salvaguarda: el reproceso **nunca** actualiza un bloque cuyo `campos` ya no esté vacío.

## 4. Prueba previa sobre 30 visitas

Antes de tocar nada masivo: muestra estratificada de 30, sembrada con semilla fija para poder repetirla.

- 10 con mención de competencia/precio, 10 con promoción/oferta/campaña, 5 sin ninguna palabra clave,
  5 con `nota_revision` no nula (para comprobar que sobrevive).
- Se procesan sobre una copia de trabajo, **sin escribir en `visita_bloques`**: el resultado se vuelca
  en `scripts/bench-visita-voz/RESULTADOS-reproceso-historico.md` con, por cada visita: texto original,
  motivos detectados, nº de bloques, campos rellenos, selects fuera de enum, latencia y tokens.
- Al final: tabla resumen con coste real medido y su extrapolación a 18.017, más el % de visitas de las
  que no se saca ningún campo.
- Con eso decides si se lanza, si se ajusta el prompt antes, o si se limita a un subconjunto.

## 5. Trazabilidad de origen

Cada bloque tocado por el reproceso queda marcado:

- `visitas.analisis_modelo` y `visitas.analisis_prompt_version` se rellenan igual que en la voz.
- Además, en `campos_meta._origen` del bloque: `{"fuente":"texto_historico","modelo":"…","prompt":"fase4.3","en":"…"}`.
  Los bloques de voz en directo no lo llevan, así que la distinción es directa en consulta y las vistas
  de la 6b pueden filtrar por ella sin cambios de esquema.

## Detalle técnico

- Modelo: `openai/gpt-5.6-luna`, prompt `fase4.3`, `temperature: 0`, mismo esquema estricto.
- Se reutiliza `esquemaExtraccion` / `sistemaExtraccion` de `_shared/visita-voz-prompt.ts`: un solo
  sitio donde vive el prompt, para que voz e histórico no diverjan.
- Migración: columnas de control + reescritura de `reprocesar_historico_a_bloques()` como encolador +
  función de desencolado con `SKIP LOCKED`, todas admin-only y con los `GRANT`/`REVOKE` del
  endurecimiento vigente.

## Anotado, no tocado

El bloque `promocion` que se pierde en algunas tiradas queda registrado como **candidato a fase 4.4**.
No se modifica el prompt en este trabajo; si la prueba de 30 lo confirma, se documenta ahí con datos.

## Orden de ejecución propuesto

1. Migración de columnas de control y funciones de cola (no procesa nada).
2. Función de borde `visita-reproceso` y pantalla de administración.
3. **Prueba de 30** y entrega de resultados. Parada para tu decisión.
4. Solo con tu visto bueno: lanzamiento por lotes de las 18.017.
