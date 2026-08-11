# Importación de bloques de visita desde extracción externa

Se descarta el reproceso por IA del histórico. En su lugar, el resultado de la extracción hecha fuera se sube como CSV desde el panel de administración, igual que el resto de fuentes de datos.

## Qué verá el administrador

En Gestión de Datos aparece una tarjeta nueva: **Bloques de visita (extracción externa)**.

1. Selecciona el CSV (separador `;`, columnas `visita_id;bloque_id;orden;motivo_key;campo_key;valor;confianza;cita`).
2. La app agrupa las filas por visita y bloque y muestra una **previsualización** antes de escribir nada:
   - bloques que se van a actualizar,
   - bloques que se van a crear,
   - bloques que se saltan por tener ya contenido (o por estar ya importados),
   - filas rechazadas, con el motivo concreto de cada rechazo.
3. Solo si el administrador confirma se escribe en la base de datos. Lo rechazado nunca aborta el resto: se importa lo válido y se informa de lo demás.
4. Al terminar, el informe distingue cuatro categorías: bloques actualizados, bloques creados, bloques saltados por la salvaguarda, filas rechazadas por validación y, aparte, **bloques que fallaron al escribir** por error de red o de permisos (no por validación), con el mensaje devuelto. Un fallo de escritura no interrumpe el resto de la importación.

## Reglas de importación

Agrupando por `(visita_id, orden)`:

- **orden = 0**: actualiza el bloque indicado por `bloque_id`, escribiendo solo `campos`, `campos_meta` y, si difiere, `motivo_key`. No se tocan `validacion`, `nota_revision`, `revisado_por` ni `revisado_en` (resultado de la FASE 6a).
- **orden > 0**: crea un bloque nuevo en esa visita heredando `validacion` y `nota_revision` del bloque 0 de la misma visita.
- **Salvaguarda**: nunca se actualiza ni se pisa un bloque cuyo `campos` ya tenga contenido; se salta y se reporta.
- **Idempotencia**: los bloques adicionales se identifican por `(visita_id, orden)`. Al reimportar el mismo fichero no se crean duplicados; los bloques ya rellenados caen en la salvaguarda y se reportan como "ya importado".

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
- Parseo del CSV en cliente: lectura del `ArrayBuffer` como texto UTF-8 con detección de BOM, split por `;` respetando comillas dobles y saltos de línea escapados.
- Antes de validar se cargan en memoria: `motivos_visita` (claves activas), `motivo_campos` (clave, tipo, `opciones`, `is_active`) y `catalogos_opciones`, reutilizando `resolverOpciones`/`camposActivos` de `src/lib/motivoCampos.ts` para no duplicar reglas.
- Contra la base de datos, en lotes por `visita_id` (chunks de ~200 para no exceder límites de PostgREST):
  - `select id, visita_id, orden, campos, validacion, nota_revision from visita_bloques where visita_id in (...)` para comprobar pertenencia, salvaguarda y herencia;
  - `update` por bloque 0 solo con `campos`, `campos_meta` y `motivo_key`;
  - `insert` de los bloques `orden > 0` que no existan aún.
- La escritura se hace desde el cliente con las políticas RLS actuales de `visita_bloques` (admin). No se añaden tablas, RPC ni migraciones.
- `invalidate` refresca las queries de visitas/bloques en React Query.
