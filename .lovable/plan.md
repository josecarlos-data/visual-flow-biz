## Fase A — Efecto de las situaciones (lo ya acordado)

### 1. Campo "Efecto" en cada situación
Tres valores: **Ocultar de alertas** (INAGRA, concurso), **Caída justificada** (sigue visible, con contexto) y **Solo informativa** (etiqueta en ficha/listado, no toca alertas). Las situaciones existentes pasan a "Ocultar" para no cambiar nada de lo actual.

### 2. Nuevas categorías
Pérdida de cliente final, reducción de flota/actividad, obra o proyecto finalizado, estacionalidad conocida — junto a las actuales.

### 3. Alertas comerciales
Conmutador de tres estados: **Atención** (por defecto: sin las ocultas; las justificadas al final, atenuadas y con su etiqueta) / **Justificadas** / **Todos**. Contador: "3 ocultos por situación · 2 con caída justificada". Ámbar para ocultas, azul para justificadas.

### 4. Ficha y listado
El aviso adapta el tono al efecto e incluye la nota completa y la vigencia.

### 5. Caso de ejemplo (demo)
Se elige un cliente real que hoy aparezca en "Caídas" y se le crea una situación de ejemplo: categoría *pérdida de cliente final*, efecto *caída justificada*, etiqueta "Perdió flota Mercadona", nota indicando que lo detectó Rafael Cárdenas en visita. Editable/borrable desde Administración cuando quieras.

## Fase B — Validación de visitas por el jefe de ventas

### Flujo
El comercial registra la visita → queda **Pendiente de revisión** → el jefe de ventas la abre, la edita si hace falta y la marca **Correcta**, **Pendiente de completar** (con nota para el comercial) o **No correcta**. Sustituye al truco actual de escribir "Correcto/Pdte" al principio de observaciones.

### Bandeja de revisión (nueva pantalla)
- Filtros por comercial, fecha, motivo y estado de validación; por defecto las pendientes.
- Cada visita muestra los campos de la plantilla, marcando en rojo los obligatorios vacíos.
- Botones rápidos: Correcta / Pendiente / No correcta + nota de revisión.
- Edición en línea de los campos por parte del revisor, con registro de quién y cuándo validó.
- Contador por comercial (visitas correctas del periodo) pensando en el incentivo, y exportación CSV.

### Requisitos de calidad por motivo
En *Administración → Plantillas de visita* se añade, por cada motivo, la marca de qué campos son **exigibles para considerar la visita correcta**. La visita muestra un semáforo automático ("cumple 5/6 requisitos") que ayuda al jefe a decidir, pero la palabra final siempre es suya.

### Quién ve qué
- Comercial: ve el estado de sus visitas y la nota del revisor; puede completar las que estén "Pendiente de completar".
- Jefe de zona: revisa las de su delegación. Director/Admin: todas.

### Botón "Justificar caída de ventas" en la visita
Desde Nueva visita / ficha de cliente, crea la situación con efecto *Caída justificada* enlazada a esa visita y comercial, sin salir del flujo.

## Detalle técnico

**Fase A**
- `ALTER TABLE public.situaciones_cliente ADD COLUMN efecto text NOT NULL DEFAULT 'ocultar' CHECK (efecto IN ('ocultar','justificada','informativa'))`.
- `situaciones_activas()` devuelve `efecto`; `panel_alertas` / `panel_dormidos` excluyen solo `efecto='ocultar'` y devuelven la columna `efecto`. `panel_ventas_kpis`, `panel_ventas_mensual` y `panel_top_*` sin tocar.
- Frontend: `EFECTOS_SITUACION` y categorías nuevas en `useCrm.ts`; variante de color en `SituacionBadge`; selector y columna en `AdminSituaciones.tsx` (+CSV); conmutador de 3 estados y ordenación en `Ventas.tsx`; tono adaptativo en `ClienteDetalle.tsx`.
- Inserción del caso demo con la herramienta de datos tras localizar un `cod_cliente` presente en "Caídas".

**Fase B**
- `visitas`: usar `validacion` con valores normalizados (`pendiente|correcta|incompleta|no_correcta`) + nuevas columnas `nota_revision text`, `revisado_por uuid`, `revisado_en timestamptz`. Default `pendiente` para origen `app`; el histórico Gespromo conserva su valor detectado.
- `motivo_campos`: nueva bandera `requerido_validacion boolean default false`.
- RLS: política de UPDATE de validación solo para admin, director comercial y jefe de zona (limitado a su delegación vía `get_user_delegacion`); el comercial puede editar campos de sus propias visitas mientras estén `pendiente`/`incompleta`.
- Nueva página `src/pages/RevisionVisitas.tsx` + ruta protegida + entrada de menú; hooks de revisión en `useCrm.ts`; marca de requisitos en `AdminVisitas.tsx`; estado y nota visibles en `Visitas.tsx` y `NuevaVisita.tsx`.
- Se implementa la Fase A completa primero; la Fase B a continuación en el mismo desarrollo.
