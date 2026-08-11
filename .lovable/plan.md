# Importación de bloques de visita desde extracción externa

Se descarta el reproceso por IA del histórico. En su lugar, el resultado de la extracción hecha fuera se sube como CSV desde el panel de administración, igual que el resto de fuentes de datos.

## Qué verá el administrador

En Gestión de Datos aparece una tarjeta nueva: **Bloques de visita (extracción externa)**.

1. Selecciona el CSV (separador `;`, columnas `visita_id;bloque_id;orden;motivo_key;campo_key;valor;confianza;cita`).
2. La app agrupa las filas por visita y bloque y muestra una **previsualización** antes de escribir nada:
   - bloques que se van a actualizar,
   - bloques que se van a crear,
   - bloques candidatos a **sobrescritura** (ya rellenados por una importación anterior),
   - bloques que se saltan por tener contenido de voz o manual,
   - filas rechazadas, con el motivo concreto de cada rechazo.
3. En la previsualización hay una casilla **"Sobrescribir bloques importados anteriormente"**, desactivada por defecto. Si no se marca, los candidatos a sobrescritura se saltan y se reportan; si se marca, se reescriben.
4. Solo si el administrador confirma se escribe en la base de datos. Lo rechazado nunca aborta el resto: se importa lo válido y se informa de lo demás.
5. Al terminar, el informe distingue: bloques actualizados, bloques creados, bloques sobrescritos, bloques saltados por la salvaguarda, filas rechazadas por validación y, aparte, **bloques que fallaron al escribir** por error de red o de permisos (no por validación), con el mensaje devuelto. Un fallo de escritura no interrumpe el resto de la importación.

## Reglas de importación

Agrupando por `(visita_id, orden)`:

- **orden = 0**: actualiza el bloque indicado por `bloque_id`, escribiendo solo `campos`, `campos_meta` y, si difiere, `motivo_key`. No se tocan `validacion`, `nota_revision`, `revisado_por` ni `revisado_en` (resultado de la FASE 6a).
- **orden > 0**: crea un bloque nuevo en esa visita heredando `validacion` y `nota_revision` del bloque 0 de la misma visita.
- **Rango reservado de numeración**: los bloques importados no comparten numeración con los que crea la voz en directo. Se guardan con `orden_efectivo = 1000 + orden` (1001, 1002, ...), de modo que todo `orden >= 1000` es, por convención, origen "extracción externa" y todo `orden < 1000` es voz o histórico.
- **Salvaguarda**: nunca se actualiza ni se pisa un bloque cuyo `campos` ya tenga contenido; se salta y se reporta.
- **Idempotencia**: los bloques adicionales se identifican por `(visita_id, orden_efectivo)`. Al reimportar el mismo fichero no se crean duplicados ni se confunde nunca un bloque de voz con uno importado; los bloques ya rellenados caen en la salvaguarda y se reportan como "ya importado".

### Contenido escrito

- `campos`: valores planos `{campo_key: valor}` casteados según el `tipo` definido en `motivo_campos` (número, booleano, multiselect separado por `" | "`, resto texto).
- `campos_meta`: `{campo_key: {cita, confianza}}` más `_origen: {"fuente":"texto_externo","en":"<fecha de importación>"}`, para poder distinguir después lo extraído de texto histórico de lo dictado por voz.

### Validaciones previas (fila a fila)

- `motivo_key` existe en `motivos_visita`.
- `campo_key` existe y está activo dentro de ese motivo.
- Campos `select`: el valor pertenece al catálogo referenciado o a la lista literal de opciones. Los `multiselect` validan cada valor por separado.
- `bloque_id` existe y pertenece a `visita_id`.

## Detalle técnico

- Nuevo módulo `src/lib/datasets/bloquesExtraccion.ts` que implementa `DatasetModule`, registrado en `src/lib/datasets/index.ts`. No hace falta tocar `AdminData.tsx`: la UI ya es genérica (selector, previsualización y reporte por etapas vía `UploadStageResult`).
- Parseo del CSV con **Papaparse** (`papaparse` + `@types/papaparse`): `delimiter: ';'`, `quoteChar: '"'`, `header: true`, `skipEmptyLines: true`. Lectura del `ArrayBuffer` como UTF-8 con detección y eliminación del BOM. Así el campo `cita`, que es texto libre, puede contener `;`, comillas dobles escapadas y saltos de línea sin romper el fichero. Los errores que devuelva Papaparse se incluyen en el informe de filas rechazadas.
- Antes de validar se cargan en memoria: `motivos_visita` (claves activas), `motivo_campos` (clave, tipo, `opciones`, `is_active`) y `catalogos_opciones`, reutilizando `resolverOpciones`/`camposActivos` de `src/lib/motivoCampos.ts` para no duplicar reglas.
- Contra la base de datos, en lotes por `visita_id` (chunks de ~200 para no exceder límites de PostgREST):
  - `select id, visita_id, orden, campos, validacion, nota_revision from visita_bloques where visita_id in (...)` para comprobar pertenencia, salvaguarda, herencia y bloques importados ya existentes (`orden >= 1000`);
  - `update` del bloque 0 solo con `campos`, `campos_meta` y `motivo_key`;
  - `insert` de los bloques con `orden_efectivo = 1000 + orden` que no existan aún.
- Cada `update`/`insert` se ejecuta con captura de error individual: los fallos de escritura (red, RLS) se acumulan en su propia lista con el mensaje y el `visita_id`/`orden`, y se muestran como etapa separada del informe sin detener el resto del lote.
- La escritura se hace desde el cliente con las políticas RLS actuales de `visita_bloques` (admin). No se añaden tablas, RPC ni migraciones.
- `invalidate` refresca las queries de visitas/bloques en React Query.
