## Objetivo

Que clientes con una situación conocida y sin solución (INAGRA por pérdida de licitación, JOAQUÍN LÓPEZ por concurso de acreedores) dejen de aparecer en primera instancia en las alertas comerciales, sin tocar en absoluto las cifras de ventas.

Regla clave: las situaciones especiales **solo filtran alertas y listados de gestión**. Nunca se restan de ventas, márgenes, KPIs ni rankings.

## 1. Registro de casos (nuevo panel de administración)

Nueva tabla `situaciones_cliente` en la base de datos:

- Cliente (código), etiqueta corta (ej. "Licitación perdida", "Concurso de acreedores"), motivo/categoría, nota larga explicativa
- Estado activo/inactivo, fecha desde y fecha hasta (opcional)
- Quién lo creó y cuándo (auditoría)
- Categorías iniciales: cierre/cese de actividad, concurso de acreedores, pérdida de contrato/licitación, venta prohibida, cliente absorbido, temporalidad conocida, otros

Permisos: consulta para cualquier usuario aprobado (para que el comercial vea la etiqueta en la ficha); alta, edición y borrado solo para administrador y director comercial.

Nueva pantalla `Administración → Situaciones de cliente`:

- Tabla con buscador (por cliente, categoría, estado) y alta/edición en diálogo
- Selector de cliente con búsqueda por nombre o código
- Interruptor activo/inactivo (desactivar en vez de borrar conserva el histórico)
- Botón **Exportar CSV** del listado completo (compatible con Excel, separador y formato es-ES)
- Opcionalmente, importación posterior desde Excel si se acumulan muchos casos (no en esta fase)

## 2. Filtro en Alertas comerciales

En el panel de Ventas, sobre las pestañas de Caídas / Riesgo de fuga / Margen bajo:

- Conmutador **Atención** (por defecto) / **Todos**
- En "Atención" se ocultan los clientes con situación activa; el contador de cada pestaña refleja lo mostrado
- En "Todos" aparecen todos, y los que tienen situación llevan una etiqueta corta de color junto al nombre con la nota en el tooltip
- Texto informativo del tipo "3 clientes ocultos por situación conocida" con enlace para cambiar a "Todos"

## 3. Etiqueta visible en el resto de la aplicación

- **Ficha de cliente**: aviso destacado bajo el nombre con la etiqueta, la categoría, la fecha y la nota completa, para que al entrar se vea al instante
- **Listado de clientes**: etiqueta compacta en la fila; el cliente se sigue pudiendo buscar y sigue contando en las ventas
- Sin cambios en los gráficos ni en los KPIs de ventas

## Detalle técnico

- `CREATE TABLE public.situaciones_cliente` (cod_cliente int referenciando `clientes`, categoria text, etiqueta text, nota text, activo bool default true, desde date, hasta date, created_by uuid, timestamps) con GRANT a `authenticated`/`service_role`, RLS activada: lectura con `is_approved(auth.uid())` limitada a `clientes_permitidos`, escritura con `is_admin` o rol `director_comercial`. Trigger de `updated_at`.
- Función auxiliar `public.cliente_con_situacion(_cod int) -> boolean` (stable, security definer) y vista/consulta de situaciones activas.
- `panel_alertas(_limite int, _incluir_excluidos boolean default false)`: se añade el parámetro y las columnas `etiqueta` y `situacion_categoria`; cuando es `false` se filtran los códigos con situación activa (`desde <= today` y `hasta` nula o futura). Las funciones `panel_ventas_kpis`, `panel_ventas_mensual`, `panel_top_clientes`, `panel_top_familias/marcas` quedan **sin tocar**.
- Nuevo hook `useSituaciones` en `src/hooks/useCrm.ts` (consulta cacheada, mutaciones de alta/edición/borrado) y componente `SituacionBadge`.
- Nueva página `src/pages/AdminSituaciones.tsx` + ruta protegida en `src/App.tsx` y entrada en `AppSidebar.tsx` (solo admin/director).
- Exportación CSV en cliente, sin dependencias nuevas.
- `panel_dormidos` recibe el mismo parámetro opcional para mantener coherencia con "Atención/Todos".
