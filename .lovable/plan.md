# Reforma de la sección de Visitas — plan por fases

**FASES 0 y 1: COMPLETADAS.** Ejecutadas el 04/08/2026 en la migración `20260804104119` y verificadas en producción. No se reejecutan ni se revierten: las tablas eliminadas siguen eliminadas, las columnas añadidas a `visitas` se quedan y `refrescar_resumenes_ventas()` mantiene su definición actual. Se retiran del documento de trabajo.

El resto del plan no se ejecuta hasta que lo indiques fase por fase.

## Estado actual verificado (consultado en la base de datos)

- `ventas_diarias`: 433.215 filas (pipeline vivo). Las tablas muertas `ventas_mensuales`, `cliente_productos` y `detalle_ventas` **ya no existen** (eliminadas en la fase 0); el código consumidor se migró a `resumen_cliente_mes` y `cliente_kpis`.
- `visitas`: 21.484 filas, **todas** con `origen = 'gespromo'`. `tipo` ya normalizado a minúscula: `ruta` (9.005), `cliente` (8.056), `llamada` (4.340), `agenda` (83).
- `visitas.validacion` solo tiene `pendiente` (11.076) y `correcta` (10.408): **no existe ningún NO CORRECTO**. Los rechazos del director están enterrados en el texto (477 filas contienen un patrón `NO C…` en `observaciones`; el marcador real de primera línea ronda las 250). Hoy caen todos en `pendiente`.
- 16.412 visitas tienen `observaciones` que empiezan en mayúsculas; **3.453 no tienen observaciones** (de ellas, 21 tienen fecha futura). Esta cifra condiciona la verificación de la fase 6a.
- `visitas.cod_cliente`: 488 filas sin cliente, todas con `cod_cliente IS NULL` (potenciales, van por `cliente_externo`). Huérfanos con código real: 0; la clave foránea quedó **validada** en la fase 1.
- `motivos_visita` — claves reales: `seguimiento`, `promocion`, `revision_seguimiento`, `competencia`, `gsmart`, `informacion_potencial`, `incidencia`. `motivo_campos`: 40 campos, **sin columna `is_active`**. `productos`: 67.076 referencias.
- `visitas` ya tiene `resultado_visita`, `visita_origen_id` y `fecha_registro` (fase 1). Sigue **sin** `audio_url` ni `observaciones_original`.
- `cliente_kpis` ya tiene `dias_activos_ultimo_ano` y la frecuencia de compra recalculada sobre 365 días (fase 0).

---

## FASE 2 — Bloques: varias plantillas por visita

**Objetivo:** una visita puede contener a la vez promoción, competencia y potencial, cada uno validable por separado.

```sql
CREATE TABLE public.visita_bloques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE CASCADE,
  motivo_key text REFERENCES public.motivos_visita(key),
  campos jsonb NOT NULL DEFAULT '{}',      -- SOLO valores planos: { clave: valor }
  campos_meta jsonb NOT NULL DEFAULT '{}', -- trazabilidad IA: { clave: { cita, confianza } }
  completo boolean NOT NULL DEFAULT true,
  validacion text NOT NULL DEFAULT 'pendiente'
    CHECK (validacion IN ('pendiente','CORRECTO','NO CORRECTO')),
  nota_revision text,
  revisado_por uuid,
  revisado_en timestamptz,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visita_bloques TO authenticated;
GRANT ALL ON public.visita_bloques TO service_role;
ALTER TABLE public.visita_bloques ENABLE ROW LEVEL SECURITY;

-- la clave foránea no crea índice: lo necesitan el trigger agregado, las políticas RLS
-- con EXISTS, las vistas de la fase 6b y el UPDATE masivo de la fase 6a (21.484 filas)
CREATE INDEX IF NOT EXISTS idx_visita_bloques_visita_id ON public.visita_bloques(visita_id);

-- mantenimiento de updated_at, igual que en el resto de tablas del proyecto
CREATE TRIGGER update_visita_bloques_updated_at BEFORE UPDATE ON public.visita_bloques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

Políticas espejo de las de `visitas`, resolviendo la visita padre (permisivas, nunca restrictivas):

```sql
CREATE POLICY "ver bloques de visitas visibles" ON public.visita_bloques
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.visitas v WHERE v.id = visita_id AND (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'director_comercial')
  OR v.user_id = auth.uid()
  OR (public.has_role(auth.uid(),'jefe_de_zona') AND v.cod_cliente IN (SELECT cod_cliente FROM public.clientes_permitidos(auth.uid())))
)));
-- INSERT/UPDATE del propio comercial; UPDATE de campos de revisión solo si puede_revisar_visitas()
```

**Normalización del vocabulario de validación — obligatoria ANTES del trigger.** El histórico usa `correcta` (10.408 filas) y el trigger agregado razona con `CORRECTO` / `NO CORRECTO` / `pendiente`. Si no se unifica aquí, el trigger no reconocería el valor heredado. Orden exacto dentro de la migración:

```sql
-- 1. normalizar el vocabulario en visitas
UPDATE public.visitas SET validacion = 'CORRECTO' WHERE validacion = 'correcta';

-- 2. crear los bloques a partir del histórico (idempotente)
INSERT INTO public.visita_bloques (visita_id, motivo_key, campos, validacion, nota_revision, revisado_por, revisado_en)
SELECT v.id, v.motivo_key, COALESCE(v.campos,'{}'::jsonb),
       CASE WHEN v.validacion IN ('CORRECTO','NO CORRECTO') THEN v.validacion ELSE 'pendiente' END,
       v.nota_revision, v.revisado_por, v.revisado_en
FROM public.visitas v
WHERE NOT EXISTS (SELECT 1 FROM public.visita_bloques b WHERE b.visita_id = v.id);

-- 3. red de seguridad sobre los bloques recién insertados
UPDATE public.visita_bloques SET validacion = 'CORRECTO' WHERE validacion = 'correcta';

-- 4. solo ahora se crea el trigger agregado
```

La **recuperación de los NO CORRECTO** desde el texto no se toca aquí: sigue en la fase 6a. Tras esta fase el reparto será `CORRECTO` (10.408) y `pendiente` (11.076), y los 250 rechazos seguirán dentro de `pendiente` hasta la 6a.

**Contrato de `campos` (obligatorio en todas las fases):** `campos` contiene **valores planos** (`{"precio_ofertado": 128.5}`), nunca objetos anidados. La trazabilidad de la IA (cita literal y confianza) va aparte, en `campos_meta` (`{"precio_ofertado": {"cita": "…", "confianza": "alta"}}`). Así las vistas de la fase 6b pueden leer con `campos->>'clave'` sin ambigüedad, y `campos_meta` se puede vaciar sin perder datos de negocio.

`visitas.motivo_key` y `visitas.campos` se **conservan como legacy**. `visitas.validacion` pasa a estado agregado, mantenido por trigger sobre `visita_bloques`.

**El estado por defecto de un bloque es `pendiente`, nunca NULL.** La columna es `NOT NULL DEFAULT 'pendiente'` con CHECK de los tres valores, y el trigger evalúa además `COALESCE(validacion,'pendiente')` como segunda red. Orden de evaluación: `NO CORRECTO` si algún bloque lo está; si no, `pendiente` si algún bloque lo está; **y solo se llega a `CORRECTO` si TODOS los bloques son explícitamente `CORRECTO`** — nunca por descarte. Visitas sin bloques (no efectivas) conservan su valor.

### Ficheros

- `src/hooks/useCrm.ts`: lectura y escritura de bloques.
- `src/pages/NuevaVisita.tsx`: N bloques con añadir/quitar; sin bloques si `resultado_visita <> 'efectiva'`.
- `src/pages/RevisionVisitas.tsx`: revisión bloque a bloque.
- `src/pages/Visitas.tsx`, `src/pages/ClienteDetalle.tsx`: render de varios bloques.

### Riesgos

Doble fuente de verdad entre `visitas.campos` y los bloques mientras dure el legacy: toda lectura nueva va a bloques; nada vuelve a escribir en `visitas.campos`.

### Verificación

1. `SELECT count(*) FROM visita_bloques;` → 21.484, un bloque por visita histórica.
2. `SELECT validacion, count(*) FROM visita_bloques GROUP BY 1;` → solo `CORRECTO` y `pendiente`; **ninguna fila con `correcta`** ni en bloques ni en `visitas`.
3. Guardar una visita nueva con 2 bloques del mismo motivo.
4. Marcar un bloque como NO CORRECTO y comprobar que la visita pasa a NO CORRECTO; volverlo a CORRECTO y comprobar que la visita vuelve a CORRECTO.
5. **Control anti-descarte:** crear una visita nueva con un bloque sin revisar y comprobar que la visita queda en `pendiente`, **nunca** en `CORRECTO`.

**Dependencias:** fase 1.

---

## FASE 3 — Plantillas definitivas: campos, tipos, catálogos y ayudas

**Objetivo:** sustituir el texto libre por campos tipados y explotables, con ayudas que alimenten a la IA.

### Base de datos

- **`motivo_campos` no tiene forma de desactivar campos** (verificado): se añade
  ```sql
  ALTER TABLE public.motivo_campos ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
  ```
  y se filtra por `is_active` en el renderizador de la visita, en el diseñador de plantillas y en el JSON schema que se envía a la IA (fase 4).
- Nuevos motivos: `viaje_incentivo`, `gestion_cobro`, `alta_reapertura`, `visita_partner`. `gsmart` se limpia de contenido de viaje.
- Nuevos tipos admitidos en `motivo_campos.tipo`: `multiselect`, `referencia`, `adjunto`.
- Reseed completo de `motivo_campos` por motivo con la definición que has dado (promoción, revisión de seguimiento, competencia, GSMart, viaje/incentivo, información/potencial, incidencia), con `opciones` cargadas y `ayuda` **en todos** los campos.
- **El reseed se hace en dos pasos, porque `ON CONFLICT DO UPDATE` no puede desactivar lo que no vuelve a insertar.** Primero se apagan todos los campos de los motivos afectados y después el upsert reactiva únicamente los que siguen en la definición nueva:
  ```sql
  -- 1. apagar todo lo existente de los motivos que se redefinen
  UPDATE public.motivo_campos SET is_active = false
  WHERE motivo_key IN ('promocion','revision_seguimiento','competencia','gsmart',
                       'informacion_potencial','incidencia','viaje_incentivo');

  -- 2. upsert de la definición nueva, que reactiva solo lo vigente
  INSERT INTO public.motivo_campos (motivo_key, campo_key, label, ayuda, tipo, opciones,
                                    is_required, sort_order, is_active)
  VALUES (...)
  ON CONFLICT (motivo_key, campo_key) DO UPDATE SET
    label = EXCLUDED.label, ayuda = EXCLUDED.ayuda, tipo = EXCLUDED.tipo,
    opciones = EXCLUDED.opciones, is_required = EXCLUDED.is_required,
    sort_order = EXCLUDED.sort_order, is_active = true;
  ```
  Los 40 campos actuales que no aparezcan en la definición nueva quedan con `is_active = false`: **no se borran**, y sus valores en los jsonb históricos se conservan.
  Requiere índice único `(motivo_key, campo_key)`; se crea si no existe.
- Catálogos (competidores, marcas de vehículo, marcas de eje, tipos de trabajo, viscosidades) en tabla `catalogos_opciones (clave, valor, orden)` para poder actualizarlos sin migración, con lista inicial razonable hasta que envíes la definitiva.
- **Precedencia entre `motivo_campos.opciones` y `catalogos_opciones` (fuente única de verdad).** `opciones` admite dos formas y solo dos:
  - lista literal: `["Sí","No","Pendiente"]` — valores propios de ese campo, no compartidos;
  - referencia a catálogo: `{"catalogo":"competidores"}` — los valores se resuelven desde `catalogos_opciones` filtrando por `clave` y ordenando por `orden`.

  Si `opciones` es un objeto con la clave `catalogo`, **la referencia manda y la lista literal se ignora**; nunca se mezclan las dos. Un catálogo vacío o inexistente rinde una lista vacía y se avisa en el diseñador, nunca se cae al literal. La resolución se implementa una sola vez en un helper compartido (`resolverOpciones`) y se aplica en los tres consumidores: el renderizador de `NuevaVisita.tsx`, el diseñador de `AdminVisitas.tsx` (que permite elegir entre literal y catálogo) y el JSON schema que se envía a la IA en la fase 4, donde los `enum` van ya resueltos a valores concretos.
- **Campos de sistema del motivo `promocion`, declarados aquí para que la fase 5 pueda escribirlos.** Se añade un tipo de visibilidad: `motivo_campos.visibilidad` (`normal` por defecto, `sistema` para los que no se pintan en el formulario ni se envían a la IA, pero sí se persisten en el jsonb del bloque). En el seed de esta fase se declaran para `promocion`:
  - `fuera_de_plazo` — booleano, `visibilidad = 'sistema'`, no obligatorio;
  - `motivo_fuera_plazo` — texto, `visibilidad = 'sistema'`, no obligatorio.

  Sin esta declaración el guardado los descartaría, porque el formulario solo persiste claves definidas en la plantilla activa. El renderizador filtra por `is_active AND visibilidad = 'normal'`; el guardado conserva además las claves `sistema`.
- **`campana_id` se declara aquí pero nace desactivado.** La tabla `campanas` no existe hasta la fase 5, así que un `select` activo rendiría una lista vacía. Se declara en el seed de `promocion` con `is_active = false` y tipo `referencia_campana`; **la fase 5 lo activa** (`is_active = true`) al crear la tabla, y ese tipo resuelve sus opciones contra `public.campanas` filtrando por `estado = 'activa'` (no contra `catalogos_opciones` ni contra una lista literal).

### Ficheros


- `src/pages/AdminVisitas.tsx`: diseñador con los tipos nuevos y edición de catálogos.
- `src/pages/NuevaVisita.tsx`: renderizador de `multiselect`, `referencia` (autocompletado contra `productos`, rellena descripción/familia/marca) y `adjunto`.
- Nuevo `src/components/ReferenciaPicker.tsx` con búsqueda servidor sobre 67.076 referencias.

### Riesgos

- Búsqueda de referencias lenta si no hay índice: se añade índice trigram sobre `productos.referencia` y `descripcion`.
- Cambiar la definición de campos deja los `campos` jsonb antiguos con claves huérfanas. No se borran; las vistas de la fase 6 las ignoran.

### Verificación

Alta de una visita con un bloque de cada motivo nuevo; comprobar en `visita_bloques.campos` que los `multiselect` guardan array y `referencia` guarda la referencia con sus datos derivados. `SELECT count(*) FROM motivo_campos WHERE ayuda IS NULL OR ayuda = '';` → 0. Un campo con `is_active = false` desaparece del formulario y del esquema enviado a la IA.

**Dependencias:** fase 2.

---

## FASE 4 — Nota de voz multibloque, repregunta y audio

**Objetivo:** el comercial cuenta la visita y la IA la reparte en bloques y campos, con trazabilidad de cada dato.

### Base de datos

```sql
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS audio_url text;
```

Bucket privado `visitas-audio` (creado con la herramienta de storage, no por SQL) + políticas sobre `storage.objects` equivalentes a las de `visitas`. Retención de 90 días mediante función `purgar_audios_visitas()`.

**`pg_cron` NO está instalado en el proyecto** (verificado: solo hay `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`; `pg_cron` y `pg_net` están disponibles pero sin instalar). Alternativa elegida, sin depender de habilitar extensiones: una edge function `purgar-audios` que valida una cabecera con secreto propio, borra del bucket los objetos de más de 90 días y llama a `purgar_audios_visitas()` para limpiar `audio_url`. Se programa desde el planificador de la plataforma con periodicidad diaria. Es idempotente y se puede lanzar a mano. Si más adelante interesa hacerlo dentro de la base de datos, se instalan `pg_cron` + `pg_net` y se agenda la misma edge function; el borrado de ficheros del bucket seguiría necesitándola.

### Ficheros

- `supabase/functions/visita-voz/index.ts`: reescrita. Entrada: audio + cliente + catálogo de motivos y sus campos **activos**. Salida:
  ```json
  { "transcripcion": "...",
    "bloques": [{ "motivo_key": "promocion", "completo": false,
                  "campos": { "precio_ofertado": 128.5 },
                  "campos_meta": { "precio_ofertado": { "cita": "se lo dejé a 128 con 50", "confianza": "alta" } } }] }
  ```
  Es decir, la función devuelve ya separados los valores planos y la metadatos, en el mismo formato en que se persisten (`campos` / `campos_meta`). Regla dura en el prompt: sin mención explícita → `null`, nunca deducir.
- `src/pages/NuevaVisita.tsx`: chuleta previa (no obligatoria) con bloques y sus puntos; revisión posterior de bloques detectados resaltando confianza baja; repregunta dirigida solo a los obligatorios vacíos; guardado del bloque como `completo = false` si el comercial no contesta.
- `src/components/VoiceRecorder.tsx`: subida del audio al bucket.

### Riesgos

- Respuestas del modelo fuera de esquema: `json_schema` estricto y fallback a bloque único con la transcripción íntegra en `observaciones`, nunca perder la narración.
- Coste y latencia con el catálogo completo: se envía solo el de motivos activos.

### Verificación

Grabar una nota que mezcle promoción y competencia → se detectan 2 bloques; un campo obligatorio omitido dispara la repregunta; `visitas.transcripcion` y `audio_url` quedan poblados y el audio no es accesible sin sesión.

**Dependencias:** fases 2 y 3.

---

## FASE 5 — Campañas (versión mínima)

**Objetivo:** que la promoción registrada se enganche a una campaña real con sus condiciones.

```sql
CREATE TABLE public.campanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL, descripcion text,
  fecha_inicio date, fecha_fin date, fecha_fin_prorroga date,
  estado text NOT NULL DEFAULT 'borrador',
  origen text NOT NULL DEFAULT 'crm', codigo_externo text,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.campana_lineas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id uuid NOT NULL REFERENCES public.campanas(id) ON DELETE CASCADE,
  referencia text, marca text, precio numeric,
  tramo_min_uds numeric, incentivo text, tipo_cliente text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanas, public.campana_lineas TO authenticated;
GRANT ALL ON public.campanas, public.campana_lineas TO service_role;
ALTER TABLE public.campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campana_lineas ENABLE ROW LEVEL SECURITY;
-- lectura: is_approved(auth.uid()); escritura: is_admin() o has_role(...,'director_comercial')

-- mantenimiento de updated_at, igual que en el resto de tablas del proyecto
CREATE TRIGGER update_campanas_updated_at BEFORE UPDATE ON public.campanas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campana_lineas_updated_at BEFORE UPDATE ON public.campana_lineas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

Fuera de plazo: el bloque de promoción guarda `fuera_de_plazo = true` y `motivo_fuera_plazo` dentro de su jsonb, en los dos campos de sistema declarados en el seed de la fase 3. **Nunca se impide guardar.**

### Ficheros

- Nueva `src/pages/AdminCampanas.tsx` (CRUD de campañas y líneas + exportación a Excel/CSV con `@e965/xlsx`).
- Nueva `src/pages/Campanas.tsx` (listado consultable de campañas activas).
- `src/pages/NuevaVisita.tsx`: selector `campana_id` que autorrellena referencia, precio, tramo e incentivo (editables).
- `src/App.tsx`, `src/components/AppSidebar.tsx`: rutas y permisos por dashboard.

### Riesgos

Campañas con muchas líneas en el selector: búsqueda paginada por campaña.

### Verificación

Crear campaña con 3 líneas, registrar una promoción eligiendo una línea y comprobar el autorrelleno; registrar una con fecha posterior a la prórroga y comprobar que se guarda marcada; exportar y abrir el fichero.

**Dependencias:** fase 3 (campo `campana_id` del bloque de promoción, declarado allí con `is_active = false`). Esta fase lo **activa** con `UPDATE public.motivo_campos SET is_active = true WHERE motivo_key = 'promocion' AND campo_key = 'campana_id';` una vez creada `campanas`.

---

## FASE 6a — Limpieza del histórico

**Objetivo:** recuperar la información sepultada en el texto de las 21.484 visitas importadas, sin perder una sola letra.

**Se puede ejecutar justo después de la fase 2.** No depende de la 3, de la 4 ni de la 5.

### Base de datos

```sql
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS observaciones_original text;
-- marca explícita de proceso: no se deduce de que la copia sea NULL,
-- porque 3.453 visitas no tienen observaciones y su copia será NULL siempre
ALTER TABLE public.visitas
  ADD COLUMN IF NOT EXISTS observaciones_repartidas boolean NOT NULL DEFAULT false;

-- función idempotente repartir_observaciones_gespromo():
--   1) copia observaciones -> observaciones_original (solo si es NULL)
--   2) parte SIEMPRE de observaciones_original
--   3) primera línea con el marcador del director -> visita_bloques.validacion
--      (NUNCA visitas.validacion: la deriva el trigger de la fase 2)
--   4) párrafos íntegros en MAYÚSCULAS -> visita_bloques.nota_revision
--      (NUNCA visitas.nota_revision: toda la revisión vive en el bloque)
--   5) resto -> observaciones
--   6) marca observaciones_repartidas = true en TODAS las filas procesadas,
--      también en las que tenían el origen vacío
```

**Estrategia de escritura masiva: trigger desactivado + recálculo agregado (opción elegida).** El UPDATE de la 6a toca 21.484 bloques y el trigger agregado de la fase 2 dispararía una escritura por fila (~43.000 en una sola transacción), con riesgo de agotar el `statement_timeout`. Se descarta el proceso por lotes por ser más lento y dejar estados intermedios visibles. La migración hace:

```sql
ALTER TABLE public.visita_bloques DISABLE TRIGGER trg_visita_bloques_agregado;

SELECT public.repartir_observaciones_gespromo();

-- recálculo de visitas.validacion en UNA sola pasada agregada
UPDATE public.visitas v SET validacion = a.estado
FROM (
  SELECT b.visita_id,
         CASE
           WHEN bool_or(COALESCE(b.validacion,'pendiente') = 'NO CORRECTO') THEN 'NO CORRECTO'
           WHEN bool_or(COALESCE(b.validacion,'pendiente') = 'pendiente')    THEN 'pendiente'
           ELSE 'CORRECTO'
         END AS estado
  FROM public.visita_bloques b GROUP BY b.visita_id
) a
WHERE a.visita_id = v.id AND v.validacion IS DISTINCT FROM a.estado;

ALTER TABLE public.visita_bloques ENABLE TRIGGER trg_visita_bloques_agregado;
```

El orden de precedencia del recálculo es idéntico al del trigger, de modo que reactivarlo no cambia ningún valor.


**Recuperación de los NO CORRECTO (punto crítico).** Verificado: `validacion` solo tiene `pendiente` (11.076) y `correcta` (10.408) — este último ya normalizado a `CORRECTO` en la fase 2 —; **no hay ni un solo NO CORRECTO**, pese a que en el fichero original hay del orden de 256 visitas rechazadas por el director. Hoy están todas cayendo en `pendiente`. La función las recupera desde `observaciones_original`, y el orden de evaluación importa: **primero la negación**, porque `NO CORRECTO` contiene `CORRECTO`.

```sql
-- primera línea normalizada: sin tildes, sin puntuación, colapsando espacios
-- 1) negación:  ^N\s*O?\s*C[A-Z]{4,10}   →  'NO CORRECTO'
--    cubre NO CORRECTO, NOCORRECTO, NO CORRETO, NO CORRCETO, NO CORREFCTO, NO CORRETCO, N O CORRECTO
-- 2) afirmación: ^C[A-Z]{4,10}           →  'CORRECTO'
--    cubre CORRECTO, CORRETO, CORRCETO, CORREFCTO, CORRETCO
-- 3) sin marcador                        →  'pendiente'
```

Se usa además `levenshtein` (extensión `fuzzystrmatch`) con distancia ≤ 3 contra `CORRECTO` para cazar variantes no previstas, y la función deja un informe con las primeras líneas que no ha sabido clasificar para revisarlas a mano. Como control previo: 477 filas contienen un patrón `NO C…` en cualquier posición del texto; el marcador válido es solo el de primera línea, de ahí que la cifra esperada sea inferior.

**La función escribe el marcador ÚNICAMENTE en `visita_bloques.validacion`** (un bloque por visita histórica) y no toca `visitas.validacion`: el trigger agregado de la fase 2 la deriva a partir de los bloques. Si escribiera en las dos, la propagación pisaría el valor recién calculado. El criterio de aceptación se comprueba igual sobre `visitas.validacion`, ya derivada: tres categorías y del orden de 250 `NO CORRECTO`.

Se deja **creada pero sin ejecutar** `reprocesar_historico_a_bloques()`, que encolará visitas antiguas para el extractor de la fase 4. No se ejecuta en esta fase ni requiere que la fase 4 exista.

### Ficheros

- `src/pages/ClienteDetalle.tsx`: `nota_revision` como aviso destacado, separado del texto del comercial.
- `src/pages/Visitas.tsx`, `src/pages/RevisionVisitas.tsx`: filtros con el vocabulario `CORRECTO` / `NO CORRECTO` / `pendiente`.

### Riesgos

- El reparto por heurística puede clasificar mal algún párrafo. Mitigación: `observaciones_original` intacto y función reejecutable.
- Si algún filtro de la UI quedó con `correcta` tras la fase 2, dejaría de encontrar filas: se revisa en esta fase.

### Verificación

1. `SELECT validacion, count(*) FROM visitas GROUP BY 1;` → **tres** categorías, con `NO CORRECTO` en el entorno de 250. Si sale muy por debajo, la fase no se da por buena: se ajustan los patrones y se reejecuta.
2. `SELECT count(*) FROM visitas WHERE observaciones_original IS NULL AND observaciones IS NOT NULL;` → 0. (No se exige `observaciones_original IS NULL` → 0 a secas: 3.453 visitas no tienen observaciones y su copia será NULL siempre.) El control de cobertura real es `SELECT count(*) FROM visitas WHERE NOT observaciones_repartidas;` → 0.
3. Reejecutar la función dos veces produce exactamente el mismo resultado.
4. Muestreo manual de 20 filas comparando `observaciones_original` con el reparto en `validacion` / `nota_revision` / `observaciones`.

**Dependencias:** fase 2.

---

## FASE 6b — Vistas analíticas

**Objetivo:** poder analizar los bloques con SQL sin pelearse con el jsonb.

**Depende de la fase 3**, porque las vistas leen las claves de campo que se definen allí.

### Base de datos

**Claves de motivo — leídas de `motivos_visita`, no inventadas.** Valores reales hoy: `seguimiento`, `promocion`, `revision_seguimiento`, `competencia`, `gsmart`, `informacion_potencial`, `incidencia`. Las vistas usan esas mismas cadenas, y la migración incluye una guarda que aborta si alguna no existe:

```sql
DO $$
BEGIN
  IF (SELECT count(*) FROM public.motivos_visita
      WHERE key IN ('promocion','competencia','informacion_potencial')) <> 3 THEN
    RAISE EXCEPTION 'Claves de motivo no encontradas en motivos_visita';
  END IF;
END $$;
```

Las vistas leen `campos->>'clave'` porque, según el contrato fijado en la fase 2, `campos` guarda **valores planos** y la trazabilidad de la IA vive en `campos_meta`.

```sql
CREATE OR REPLACE VIEW public.v_visita_oferta AS
SELECT v.id AS visita_id, v.cod_cliente, v.fecha, v.vendedor,
       b.campos->>'campana_id' AS campana_id,
       b.campos->>'referencia' AS referencia,
       (b.campos->>'precio_ofertado')::numeric AS precio_ofertado,
       (b.campos->>'unidades_tramo')::numeric AS unidades_tramo,
       b.campos->>'respuesta_cliente' AS respuesta_cliente,
       (b.campos->>'importe_estimado')::numeric AS importe_estimado
FROM public.visita_bloques b JOIN public.visitas v ON v.id = b.visita_id
WHERE b.motivo_key = 'promocion';

CREATE OR REPLACE VIEW public.v_visita_competencia AS
SELECT v.id AS visita_id, v.cod_cliente, v.fecha,
       b.campos->>'competidor' AS competidor,
       b.campos->>'referencia_rimosa' AS referencia_rimosa,
       (b.campos->>'precio_rimosa')::numeric  AS precio_rimosa,
       (b.campos->>'precio_competidor')::numeric AS precio_competidor,
       (b.campos->>'precio_rimosa')::numeric - (b.campos->>'precio_competidor')::numeric AS gap_eur,
       CASE WHEN (b.campos->>'precio_competidor')::numeric > 0
            THEN ROUND(((b.campos->>'precio_rimosa')::numeric / (b.campos->>'precio_competidor')::numeric - 1) * 100, 2) END AS gap_pct,
       (b.campos->>'venta_perdida')::boolean AS venta_perdida
FROM public.visita_bloques b JOIN public.visitas v ON v.id = b.visita_id
WHERE b.motivo_key = 'competencia';

CREATE OR REPLACE VIEW public.v_ficha_flota_actual AS
SELECT DISTINCT ON (v.cod_cliente) v.cod_cliente, v.fecha, b.campos
FROM public.visita_bloques b JOIN public.visitas v ON v.id = b.visita_id
WHERE b.motivo_key = 'informacion_potencial'
ORDER BY v.cod_cliente, COALESCE((b.campos->>'fecha_verificacion')::date, v.fecha) DESC;
```

Los casts numéricos se hacen con función auxiliar tolerante para no romper la vista con texto no numérico.

### Ficheros

Ninguno obligatorio: son vistas de consulta. Opcionalmente se exponen en una pantalla de análisis en fases posteriores.

### Riesgos

Un cambio posterior en las claves de campo de la fase 3 rompe las vistas. Mitigación: las claves quedan documentadas junto al seed.

### Verificación

Las tres vistas devuelven filas coherentes con los bloques registrados, `campos->>'clave'` da valores escalares (no objetos JSON) y `gap_pct` cuadra con un cálculo manual sobre un bloque de competencia.

**Dependencias:** fases 2 y 3.

---

## Resumen y orden recomendado

| Orden | Fase | Contenido | Esfuerzo | Depende de |
|---|---|---|---|---|
| 1 | 0 | Higiene de datos, pipeline único, frecuencia de compra | Medio | — |
| 2 | 1 | Cabecera de visita (resultado, origen, fecha de registro) | Bajo | 0 |
| 3 | 2 | Bloques múltiples + normalización del vocabulario de validación | Alto | 1 |
| 4 | 6a | Limpieza del histórico y recuperación de los NO CORRECTO | Medio | 2 |
| 5 | 3 | Plantillas, tipos nuevos, catálogos y ayudas | Alto | 2 |
| 6 | 4 | Voz multibloque, repregunta y audio en storage | Alto | 2, 3 |
| 7 | 5 | Campañas mínimas y enganche con promoción | Medio | 3 |
| 8 | 6b | Vistas analíticas sobre los bloques | Bajo | 2, 3 |

La 6a se adelanta porque solo depende de la 2 y desbloquea la revisión real del director. Las fases 4, 5 y 6b son intercambiables entre sí una vez cerrada la 3.

