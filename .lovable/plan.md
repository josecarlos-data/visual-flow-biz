## 1. Botón alterno de selección (detalle de ruta)

En `/rutas/:codigo` hoy la selección vacía significa "todos marcados" y el botón sólo sirve para limpiar. Cambios:

- Estado explícito de selección: al cargar la lista, todos los clientes visibles quedan seleccionados de verdad (no por convención de conjunto vacío).
- Un único botón alterno:
  - Si hay alguno sin marcar → texto "Seleccionar todos".
  - Si están todos marcados → texto "Quitar selección" (deselecciona todo).
- Con 0 seleccionados, las acciones "Ver en el mapa" y "Planificar día" se deshabilitan y el contador muestra "0 de N seleccionados".
- El contador pasa a mostrarse siempre: "X de N seleccionados".
- Al cambiar el filtro Activos/Todos o el orden, la selección se recalcula sobre los clientes visibles.

Así, para elegir 5 de 70: pulsar "Quitar selección" y marcar sólo esos 5.

## 2. Ordenación/prefiltro en el panel principal de Rutas

Añadir en `/rutas`, junto al buscador, el mismo tipo de desplegable que ya existe en el detalle (orden en cliente, sin tocar la base de datos):

- Por ventas (año actual, descendente) — por defecto
- Primero las que caen (mayor caída frente al año anterior)
- Más tiempo sin visitar (última visita más antigua primero)
- Más clientes sin visitar (+90 días)
- Por nombre de ruta

Se añade también un pequeño resumen bajo el buscador: nº de rutas y total de ventas del año en curso de las rutas mostradas.

## 3. Google Maps bloqueado (ERR_BLOCKED_BY_RESPONSE)

El enlace generado es correcto; el fallo viene de cómo se abre: `window.open(...)` desde dentro del iframe de la app hace que Google rechace la respuesta en esa ventana. Cambios:

- Sustituir `window.open` por enlaces reales (`<a target="_blank" rel="noopener noreferrer">`) tanto en la agenda como en el diálogo de tramos y en "Cómo llegar". Un clic de usuario sobre un ancla real abre pestaña de nivel superior y Google no la bloquea.
- En la agenda, no abrir varias pestañas a la vez (los navegadores bloquean las siguientes): si hay más de un tramo, mostrar el mismo diálogo "Ruta por tramos" que ya existe en el detalle de ruta, con un enlace por tramo.
- Añadir en ese diálogo un botón "Copiar enlace" por tramo, como salida cuando el navegador o la red corporativa bloquea la apertura directa.
- Usar el formato de URL `https://www.google.com/maps/dir/lat,lng/lat,lng/...`, más tolerante que `dir/?api=1&waypoints=` y que funciona igual en la app móvil de Google Maps.

## Detalle técnico

- `src/pages/RutaDetalle.tsx`: estado `seleccion` como conjunto real inicializado desde `lista`, `useEffect` de sincronización al cambiar datos, botón alterno, guardas en acciones, enlaces en lugar de `window.open`.
- `src/pages/Rutas.tsx`: `Select` de orden + `useMemo` de ordenación sobre los datos de `useRutas`.
- `src/lib/maps.ts`: nueva construcción de URL por segmentos de ruta (`/maps/dir/...`), manteniendo `MAX_PARADAS = 10` y `tramos()`.
- `src/pages/Agenda.tsx`: diálogo de tramos reutilizando la lógica del detalle de ruta.

Sin cambios en base de datos.
