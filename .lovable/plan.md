# FASE 4 — Ajustes tras la prueba con narraciones reales

Solo se toca la FASE 4: función `visita-voz`, plantillas de campos, pantalla de visita
y dos columnas de trazabilidad. Nada de FASE 5 ni 6b.

## 1. Modelo de extracción: `luna` con prueba previa

- La extracción pasa de `openai/gpt-5.6-sol` a `openai/gpt-5.6-luna`, por la pasarela
  de Lovable. La llamada directa al proveedor queda documentada en el propio archivo
  como comentario, sin implementar.
- **Antes de fijarlo**: se ejecutan las MISMAS tres narraciones del histórico
  (Icer/Dometic, GSMart+viaje, potencial+competencia) contra `sol` y contra `luna`,
  con el prompt ya corregido (regla de competencia incluida), y se entrega la tabla:
  motivos acertados / campos correctos / selects fuera de enum / latencia.
  Si `luna` clasifica peor los motivos, se queda `sol` y se dice.
- Se mantiene `reasoning_effort: "none"`. Se añade `temperature: 0`; si el modelo lo
  rechaza con 400, se quita (el esquema estricto ya acota la salida).
- `response_format` sigue siendo `json_schema` con `strict: true` — ya lo está; se
  verifica que todo el esquema cumple el contrato estricto tras los cambios.

## 2. Transcripción

Sigue `gpt-4o-transcribe` con `language: "es"`. Único cambio: se añade el parámetro
`prompt` con el vocabulario del sector, para que deje de oír "Ize"/"Ether" por Icer y
"Alpoliva" por "el polígono":

albarán, referencia, rappel, GSMart, Top Truck, delegación, electromecánico, ejes SAF,
ejes BPW, pastillas, discos, Icer, Febi, Dometic, Sachs, TitanX, Knorr, Volvo, Scania,
DAF, Ford, Eurorrecambios — más, cargados en caliente, los valores del catálogo
`competidores` y los nombres de comerciales (`get_distinct_vendedores`). Ese trozo
dinámico se cachea en memoria de la función.

## 3. Prompt caching

El system prompt (11 motivos, descripciones y reglas de desempate) se construye una
vez por arranque y se reutiliza **idéntico carácter por carácter**: va siempre primero
y no lleva nada variable. Cliente y transcripción van en el mensaje de usuario.

## 4. Citas más cortas

Se mantienen las citas en todos los campos rellenos, pero acortadas: la descripción del
campo `cita` pasa a pedir **un fragmento literal de 5 a 10 palabras**, no la frase
entera; el servidor recorta a 12 palabras por si el modelo se pasa.

## 5. Obligatoriedad de campos (datos falsos)

Hoy hay 37 campos con `is_required = true`, entre ellos referencias que el comercial no
siempre dice. Se rebaja a `requerido_validacion` (aviso ámbar, no bloquea el guardado)
todo lo que no sea imprescindible para que el bloque tenga sentido:

- `promocion.referencia`, `competencia.referencia_competencia`,
  `informacion_potencial.referencias_consumo` — todas las referencias de producto.
- Los importes y datos que dependen de que el cliente los suelte:
  `competencia.precio_competencia`, `precio_rimosa`, `marca_competencia`,
  `promocion.cantidad`, `precio_ofertado`, `canal_envio`,
  `informacion_potencial.num_mecanicos`, `num_vehiculos`, `persona_contacto`,
  `marcas_vehiculo`, `gestion_cobro.importe_pendiente`,
  `alta_reapertura.persona_contacto`, `razon_social`, `visita_partner.partner_nombre`,
  `incidencia.solucion`, `seguimiento.proxima_accion`,
  `revision_seguimiento.interlocutor`, `canal`, `seguimiento.interlocutor`.

Se quedan como `is_required` solo los que definen el bloque: el `select` que le da
sentido (`respuesta_cliente`, `resultado`, `resultado_venta`, `competidor`,
`tipo_incidencia`, `tema`, `compromiso_pago`, `origen_alta`, `partner`, `interesado`)
y el texto que describe el asunto (`temas_tratados`, `tema_revisado`, `descripcion`,
`conclusion`, `motivo_conjunto`). Todos siguen siendo `requerido_validacion` donde ya
lo eran.

## 6. El bloque de competencia nunca se creaba

En las tres narraciones había comparación explícita de precio con Euro Recambios y las
tres acabaron en `revision_seguimiento` con "Venta perdida" y los precios enterrados en
`motivo_perdida`. Se corrige en el prompt con una regla imperativa y un ejemplo:

> Si en la narración aparece un competidor nombrado o un precio de otro proveedor,
> creas SIEMPRE un bloque `competencia` con `competidor`, `precio_rimosa`,
> `precio_competencia` y `resultado_venta`, **además** del bloque de seguimiento o
> revisión que corresponda. No son excluyentes: la misma situación genera los dos.

Se refuerza también en la `descripcion` del motivo `competencia` y con un
recordatorio de que los precios no deben quedarse solo en un campo de texto libre.

## 7. Menores de la prueba

- "Remolques" se colaba como marca de vehículo: se añade a la ayuda de
  `marcas_vehiculo` que solo van marcas reales de fabricante, y "Remolques" u otros
  tipos de vehículo van a `observaciones`.
- Los electromecánicos iban a `observaciones` en vez de a `num_electromecanicos`: se
  aclara en la ayuda de ese campo qué frases lo alimentan.
- `referencias_consumo` guardó "Ha": el servidor descarta valores de campos
  `referencia` de menos de 3 caracteres o sin ningún dígito, y la ayuda lo explicita.

## 8. Trazabilidad y reanálisis

- Migración: `visitas.analisis_modelo` (text) y `visitas.analisis_prompt_version`
  (text). La versión del prompt es una constante en la función (`fase4.2`), que se
  sube a mano cuando cambian las reglas.
- La extracción devuelve ambos valores y la pantalla los guarda con la visita.
- **Reanalizar**: botón en la visita ya guardada (detalle de visita / revisión) que
  vuelve a llamar a `visita-voz` con la `transcripcion` almacenada, sin transcribir
  otra vez, y propone bloques nuevos que el comercial confirma antes de sustituir a
  los actuales. Los bloques existentes no se borran hasta que confirma.

## 9. Cliente

Confirmado por código: el cliente se elige siempre en el desplegable de la pantalla
antes de grabar (`cod_cliente`), y al modelo solo se le pasa el **nombre** como
contexto de lectura. El modelo no devuelve cliente en el esquema y la aplicación nunca
lo lee de la transcripción. Se documenta explícitamente en el prompt: "no deduzcas el
cliente, ya viene dado".

## 10. Verificación

- Tabla `sol` vs `luna` sobre las tres narraciones, antes de fijar el modelo.
- Las tres narraciones producen ahora un bloque `competencia` con los cuatro campos.
- Una narración sin referencias se guarda sin bloquear.
- `SELECT count(*) FROM visitas WHERE transcripcion IS NOT NULL AND analisis_modelo IS NULL`
  → 0 en las visitas creadas tras el cambio.
- Reanalizar una visita antigua no vuelve a llamar a transcripción (comprobado en logs).
