## Objetivo

Hoy la página `/admin/data` solo permite cargar el Excel de **Ventas** (clientes + ventas mensuales). Hay que convertirla en una página **multi-fuente**, donde el admin elige qué conjunto de datos quiere subir (Ventas, Compras, y los que vengan en el futuro como Fichaje), con un parser y un destino diferente para cada uno.

## Cambios propuestos

### 1. Selector de fuente de datos en `/admin/data`

En la parte superior de la página, añadir un **selector de tipo de dataset** (tarjetas o tabs) con las opciones disponibles. Inicialmente:

- **Ventas** (operativa actual: parsea `Cod.`, `Cliente`, `Año`, `MesNumero`, `Valor`… y vuelca a `clientes` + `ventas_mensuales`).
- **Compras** (nueva, ficticia por ahora: parsea un Excel con `Proveedor`, `Referencia`, `Importe`, `Fecha`… y vuelca a una tabla `compras`).

El selector controla:
- Qué parser usa el `FileReader`.
- Qué columnas se muestran en la vista previa.
- A qué tablas se hace el upsert.
- Qué queries de React Query se invalidan al terminar.

Cada fuente se describe con metadatos: `key`, `nombre`, `icono`, `descripción corta`, `columnas esperadas` (para mostrar al usuario qué cabeceras debe tener su Excel).

### 2. Refactor del código de `AdminData.tsx`

- Extraer la lógica actual de Ventas a un módulo `src/lib/datasets/ventas.ts` con: `parse(buffer)`, `preview(data)`, `upload(data, supabase)`, `invalidateKeys`.
- Crear un módulo análogo `src/lib/datasets/compras.ts` con un parser sencillo para el Excel ficticio de compras.
- Crear un registro `src/lib/datasets/index.ts` que exporte un array `DATASETS` con todas las fuentes disponibles.
- `AdminData.tsx` queda como un orquestador: muestra el selector, renderiza la zona de upload + vista previa según el dataset elegido y delega parse/upload al módulo correspondiente.

### 3. Nueva tabla `compras` (placeholder real)

Para que el flujo de Compras sea funcional de extremo a extremo (no solo UI), crear en BD:

- Tabla `public.compras` con columnas: `id uuid pk`, `proveedor text`, `referencia text`, `importe numeric`, `fecha date`, `categoria text null`, `created_at`, `updated_at`.
- RLS:
  - SELECT: usuarios aprobados con `has_dashboard_access(auth.uid(), 'compras')`.
  - INSERT/UPDATE/DELETE: solo `is_admin(auth.uid())`.
- Índice por `fecha` para consultas futuras.

La página `/compras` seguirá mostrando datos de ejemplo por ahora (tal como está), pero los datos cargados quedarán persistidos para cuando se conecte el dashboard real.

### 4. UX de la página

```text
┌────────────────────────────────────────────────────────┐
│ Gestión de Datos                                       │
│ Selecciona qué tipo de información vas a cargar       │
├────────────────────────────────────────────────────────┤
│ [ Ventas ✓ ]  [ Compras ]   ( ...futuros: Fichaje )   │
├────────────────────────────────────────────────────────┤
│ Ventas — clientes + ventas mensuales                   │
│ Columnas esperadas: Cod., Cliente, Delegación, Año... │
│                                                        │
│ [ 📄 Seleccionar archivo Excel ]   [ Subir N filas ]  │
│                                                        │
│ Vista previa (20 filas) ...                            │
└────────────────────────────────────────────────────────┘
```

Al cambiar de dataset se resetea el archivo cargado y los resultados.

## Archivos afectados

- `src/pages/AdminData.tsx` — refactor a orquestador con selector.
- `src/lib/datasets/ventas.ts` — nuevo (extrae lógica actual).
- `src/lib/datasets/compras.ts` — nuevo (parser Excel ficticio).
- `src/lib/datasets/index.ts` — nuevo (registro de datasets).
- Migración SQL — crea `public.compras` + RLS + índice.

## Notas

- No se toca el sidebar, autenticación ni el sistema de permisos por dashboard ya implementado.
- El esquema de Compras es preliminar; cuando llegue el Excel real se ajustarán columnas con una nueva migración.
- Añadir un nuevo dataset en el futuro (p.ej. Fichaje) requerirá: 1 archivo en `src/lib/datasets/` + registrarlo en `index.ts` + migración para su tabla. Cero cambios en `AdminData.tsx`.
