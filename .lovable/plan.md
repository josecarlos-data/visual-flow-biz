## Qué he comprobado

- Los datos están completos: 35.428 filas de resumen mensual, 84.666 por familia, 83.034 por marca, 3.419 clientes con KPIs (2024: 14,6 M€ / 2025: 15,0 M€ / 2026: 7,9 M€).
- Los permisos y el acceso a las tablas están bien; el problema no es de datos ni de GRANTs.
- Causa muy probable de los KPIs y gráficos vacíos: las funciones `panel_ventas_kpis`, `panel_ventas_mensual`, `panel_top_familias` y `panel_top_marcas` **no** son de tipo "security definer", así que la regla de acceso `can_view_cliente(...)` se evalúa **fila a fila** (35.000–85.000 veces por consulta). El rol de la aplicación tiene un límite de 8 segundos por consulta, por lo que esas llamadas se cortan y llegan vacías. Las que sí funcionan (alertas, top clientes) leen tablas mucho más pequeñas o mejor filtradas. Primer paso del trabajo: confirmarlo midiendo el tiempo real de cada función antes de cambiarlas.

## Plan

### 1. Arreglar el Panel de Ventas (prioridad)
- Reescribir las funciones de panel (`panel_ventas_kpis`, `panel_ventas_mensual`, `panel_top_clientes`, `panel_top_familias`, `panel_top_marcas`, `panel_alertas`, `panel_dormidos`) como funciones seguras que aplican **una sola vez** el filtro de visibilidad según el rol (admin/dirección: todo; jefe de zona: su delegación; comercial: sus clientes), en lugar de comprobarlo fila a fila.
- Añadir índices de apoyo por `cod_cliente` en las tablas de resumen.
- Resultado: todos los KPIs, la evolución mensual y los tops se cargan en menos de un segundo y respetan que cada comercial vea solo lo suyo.
- Añadir en la pantalla un aviso claro si una consulta falla, en vez de mostrar ceros silenciosos.

### 2. Orden por defecto: importe del año actual, descendente
- Nueva función que devuelve, para cada cliente visible, su facturación del año actual y del anterior.
- Se aplica como orden por defecto en: listado de Clientes, buscador de cliente en Nueva Visita, selector de cliente en Agenda y el filtro de clientes de los paneles.
- En cada uno, un botón de alternancia para pasar a orden alfabético (A-Z), manteniendo "por ventas" como opción por defecto.

### 3. Clientes activos
- Concepto: cliente con al menos una venta en los últimos N años (N configurable, por defecto 3).
- Nueva tabla de **ajustes de la aplicación** con el parámetro `anios_cliente_activo`, editable desde Administración (solo admin).
- En Clientes (y demás selectores) un interruptor **Activos / Todos**, con "Activos" por defecto.
- El contador de resultados indicará cuántos se están mostrando de cuántos totales.

### 4. Visitas
Una vez validado lo anterior, me pasas el informe de visitas de los 2 últimos años y diseñamos el panel de visitas y su uso como base de conocimiento para la IA.

## Detalles técnicos

- Migración: funciones `SECURITY DEFINER` con `search_path` fijo, filtro por rol resuelto en un CTE de `cod_cliente` permitidos; `EXECUTE` concedido solo a `authenticated`; `REVOKE` de `anon`/`PUBLIC`.
- Nueva tabla `app_settings` (clave/valor) con RLS: lectura para usuarios aprobados, escritura solo admin, más los GRANT correspondientes.
- Nueva función `clientes_visibles(_solo_activos boolean, _anios int)` devolviendo `cod_cliente, cliente, ruta, localidad, vendedor, importe_actual, importe_anterior, ultima_compra`, ordenada por importe descendente.
- Frontend: `useCrm.ts` pasa a consumir esa función con parámetros de orden/activos; estado compartido de preferencia de orden.
- El margen se sigue devolviendo solo si `puede_ver_margen`.
