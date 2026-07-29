## Problema confirmado

La ficha de cliente lee de tablas que hoy están **vacías**:

- `ventas_mensuales` → 0 filas (de ahí "Ventas último año: 0 €" y "Variación anual: —")
- `cliente_productos` → 0 filas (de ahí "Referencias: 0" y pestaña Productos vacía)

Los datos reales de Maestro ISI están en: `ventas_diarias` (402.527 líneas), `resumen_cliente_mes` (35.428), `resumen_cliente_familia`, `resumen_cliente_marca` y `cliente_kpis` (3.419). El listado general de clientes ya usa estas tablas, por eso ahí sí se ven los importes.

## Qué haré

### 1. Conectar la ficha a las tablas reales

Reescribir los hooks de `src/hooks/useCrm.ts`:

- **Ventas mensuales/anuales**: leer `resumen_cliente_mes` (importe, margen, unidades, líneas) en vez de `ventas_mensuales`.
- **KPIs**: leer `cliente_kpis` (primera/última compra, días sin comprar, nº referencias, nº líneas, importe y margen total, año actual, año anterior y año anterior YTD).
- **Productos**: nueva función de base de datos `cliente_top_productos(cod, año)` que agrega `ventas_diarias` por referencia (importe, unidades, última compra, familia, marca, descripción desde `productos`), con control de acceso por rol (`can_view_cliente`) y ocultando el margen si el usuario no tiene permiso (`puede_ver_margen`).
- **Familias y marcas**: leer `resumen_cliente_familia` y `resumen_cliente_marca` del cliente.

### 2. Rediseñar la cabecera de KPIs

Fila de tarjetas con datos reales y comparables:

- Ventas año en curso + variación vs. mismo periodo del año anterior (YTD, comparación justa)
- Ventas año anterior completo
- Margen y % de margen (solo visible si el usuario tiene permiso de margen)
- Nº de referencias distintas
- Última compra y días sin comprar (con aviso visual si supera 90 días)
- Última visita

### 3. Pestaña Resumen ampliada

- Gráfico de evolución **anual** (importe por año, ya existente pero con datos reales).
- Gráfico de evolución **mensual año actual vs. año anterior** (líneas), igual criterio que el panel de Ventas.
- Top familias y top marcas del cliente (barras horizontales, top 8).

### 4. Datos de ficha ampliados

La tarjeta "Datos de ficha" pasa a una rejilla de dos columnas con etiquetas y valores, incluyendo:

- **Comercial** (vendedor y su código), **Ruta comercial**, **Ruta especial**, **Delegación**
- Tipo de cliente, Grupo, Grupo/tramos de rappel
- CIF / Razón social, Persona de contacto, Teléfonos, Email, Web
- Dirección completa (dirección, CP, localidad, provincia)
- Fecha de alta y antigüedad, Nº empleados de taller, Top Truck (distintivo)
- Aviso de prohibición de venta destacado en rojo si existe
- Observaciones de almacén

Los datos de comercial/delegación/rappel se muestran a todos los roles (un comercial solo ve sus propios clientes, así que no hay fuga de información).

### 5. Pestaña Productos

Tabla con los datos reales agregados: referencia, descripción, familia, marca, unidades, importe, última compra, con selector de año (todos / año concreto) y orden por importe.

## Detalle técnico

- Nueva función SQL `public.cliente_top_productos(_cod integer, _anio integer default null)` — `SECURITY DEFINER`, comprueba `can_view_cliente(auth.uid(), _cod)`, `GRANT EXECUTE` solo a `authenticated`.
- El resto de lecturas van directas a tabla: las políticas RLS de `resumen_cliente_*` y `cliente_kpis` ya filtran por `can_view_cliente`.
- Formato numérico con los helpers existentes de `src/lib/format.ts` (miles con ".", 0 decimales en KPIs, 2 en tablas).
- Sin cambios de esquema en tablas; `ventas_mensuales` y `cliente_productos` quedan sin uso en la ficha (no se borran).
