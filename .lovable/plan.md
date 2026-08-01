## Objetivo

Nueva sección **Objetivos**: el administrador y el jefe de ventas (director comercial) fijan importes anuales por comercial, y cada comercial ve su avance YTD y su proyección de cierre con un motor quincenal alineado con los períodos de facturación.

## 0. Motor de proyección quincenal (base de todo lo demás)

Sustituye al cálculo mensual actual para objetivos (y queda disponible para el resto de la app):

- El año se divide en **24 quincenas** (día 1-15 y 16-fin de cada mes).
- El **corte** no se toma del calendario del navegador sino de la **última fecha de venta cargada** en la base de datos: se usa la última quincena completamente cerrada y cargada. Ejemplos: datos hasta 28-feb → 4 quincenas; datos hasta 15-jul → quincena 13 de 24.
- Perfil estacional: peso de cada quincena del año anterior sobre su total.
- Proyección de cierre = ventas reales acumuladas hasta el corte ÷ suma de pesos de esas mismas quincenas × 1 (peso total del año). Sin duplicar medias quincenas ni inventar datos parciales.
- Si no hay año anterior suficiente, reparto uniforme de 1/24 por quincena.
- Se muestra siempre el corte usado ("datos hasta 15/07 · quincena 13 de 24") para que la cifra sea explicable ante gerencia o cliente.

## Tipos de objetivo

1. **Objetivo de cartera** — importe anual del comercial con sus clientes habituales. Excluye siempre las ventas de las rutas especiales con objetivo particular activo (RC2026, MAG2026, MV2026, MS2026, DM2026, JAB2026).
2. **Objetivo particular por ruta especial** — importe anual independiente sobre los clientes de esa ruta. No suma en el objetivo de cartera.

La estructura queda preparada para añadir más tipos después (por producto, por cliente concreto) sin rehacer nada.

## Panel de administración (`/admin/objetivos`)

- Tabla con todos los comerciales del año en curso: objetivo de cartera, objetivos particulares, vendido y avance.
- Al crear un objetivo de cartera, la app **propone** el importe = ventas del año anterior de su cartera × (1 + % configurable, por defecto 5%). El importe queda **siempre editable a mano**.
- Al crear un objetivo particular se elige una ruta especial y se propone el importe = ventas del año anterior de los clientes de esa ruta (criterio "mantener cifra"). También editable.
- Acciones: crear, editar importe/nota, activar/desactivar y generar propuestas para todos los comerciales de golpe, revisables antes de guardar.
- Acceso: admin y director comercial.

## Vista del comercial

- **Nueva página `/objetivos`** en el menú lateral (sujeta al permiso de dashboard existente):
  - Tarjeta grande "Objetivo de cartera": importe objetivo, vendido a la fecha de corte, % conseguido, barra de progreso, proyección de cierre quincenal y semáforo verde/ámbar/rojo según si la proyección alcanza el objetivo.
  - "Ritmo necesario": lo que debería llevar vendido a esta quincena frente a lo real, y euros/quincena necesarios para llegar.
  - Una tarjeta por cada objetivo particular con la misma información, más el listado de clientes de esa ruta con venta actual frente al año anterior, para ver quién lastra el objetivo.
- **Resumen compacto en el dashboard de Ventas**: mini-tarjetas (objetivo, % logrado, proyección) enlazadas a `/objetivos`, que es donde el comercial entra a diario.
- Admin/director ven el mismo panel con selector de comercial y un ranking de cumplimiento.

## Detalle técnico

Base de datos (una migración):

- `objetivos` (`anio`, `tipo` `'cartera'|'ruta'`, `cod_vendedor`, `vendedor`, `ruta` nullable, `importe_objetivo`, `base_anio_anterior`, `porcentaje`, `nota`, `activo`, `created_by`, timestamps), único por (`anio`,`tipo`,`cod_vendedor`,`ruta`).
- GRANTs a `authenticated` y `service_role`; RLS: lectura para admin/director y para el comercial dueño (vía `get_user_employee_code`); escritura sólo admin/director.
- RPC `objetivos_seguimiento(_anio int)` (security definer): por objetivo devuelve importe, vendido hasta el corte, serie quincenal del año actual y del anterior, y la fecha de corte. La cartera excluye clientes con `ruta_especial` que tenga objetivo particular activo.
- RPC `objetivos_propuesta(_anio int, _pct numeric)`: importes sugeridos por comercial y por ruta especial a partir de `ventas_diarias`.
- Fila en `dashboards` con clave `objetivos` para el control de permisos.

Frontend:

- `src/lib/projectionQuincenal.ts`: nuevo motor (índice de quincena a partir de una fecha, pesos, corte por última quincena cargada, proyección). Con tests en `src/test`.
- `src/hooks/useObjetivos.ts`, `src/pages/Objetivos.tsx`, `src/pages/AdminObjetivos.tsx`, componente `ObjetivoCard` reutilizable, resumen en `src/pages/Ventas.tsx`.
- Rutas nuevas en `src/App.tsx` y entrada de administración en `AppSidebar.tsx`.
- `src/lib/projection.ts` se mantiene intacto para los gráficos actuales; la migración del resto de la app al motor quincenal se valorará después.
