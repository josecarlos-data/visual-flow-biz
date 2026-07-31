## Objetivo

1. Que al entrar en una ruta se vean **solo los clientes activos** por defecto (con opción "Todos").
2. Añadir un **optimizador de ruta por cercanía** para ordenar las paradas del día.

## 1. Filtro de clientes activos en la ruta

Hoy `ruta_clientes(_ruta)` devuelve todos los clientes de la ruta (p. ej. 600 en GU0MO), incluidos los que nunca han comprado.

- Migración: nueva versión de `ruta_clientes(_ruta text, _solo_activos boolean default true)`. Activo = tiene compra dentro del umbral configurable de `app_settings.anios_cliente_activo` (hoy 3 años), es decir `dias_sin_comprar <= años*365`. Se devuelve también un campo `activo` para poder marcar visualmente los inactivos cuando se ve "Todos".
- Frontend (`src/hooks/useCrm.ts`, `src/pages/RutaDetalle.tsx`):
  - `useRutaClientes(ruta, soloActivos)` con `soloActivos = true` por defecto.
  - Junto al selector de orden (que se mantiene tal cual), un toggle **Activos / Todos**.
  - La cabecera muestra "X activos de Y" para que se entienda qué se está filtrando.
  - La selección múltiple, el mapa y "Planificar día" operan sobre la lista visible.

## 2. Optimizador de ruta por cercanía

Nueva utilidad en `src/lib/maps.ts`: ordenación por vecino más próximo (nearest-neighbour con distancia haversine), partiendo de la ubicación GPS actual del comercial si la concede, o del cliente con más ventas si no.

Dónde se usa:

- **Detalle de ruta**: nueva opción de orden "Ruta más corta (por cercanía)" y, al pulsar "Ver en el mapa", las paradas ya van optimizadas antes de partirse en tramos de 10.
- **Agenda del día** (`src/pages/Agenda.tsx`): botón "Optimizar recorrido" que reordena las visitas planificadas del día por cercanía y guarda el nuevo `orden` en `visitas_planificadas`, más un botón para abrir ese recorrido en Google Maps.
- Los clientes sin coordenadas quedan al final de la lista, señalados como "sin ubicación" (ya existe ese aviso).

## Detalles técnicos

- Sin API key de Google: se sigue usando la URL `dir/` de Maps y el cálculo de distancias es local (haversine), suficiente para ordenar paradas urbanas/comarcales.
- Cambio de firma de RPC con valor por defecto, para no romper llamadas existentes.
- El umbral de actividad se lee de `app_settings`, no se codifica en duro.
