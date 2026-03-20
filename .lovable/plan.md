

## Plan: Reorganizar filtros en una sola fila

### Cambio

Mover el filtro de **Clientes** a la misma fila que **Años**, **Mes inicio** y **Mes fin**, colocándolo a la izquierda. Esto reduce la altura del panel de filtros eliminando una fila completa.

### Layout resultante

Para admin/director (con Vendedores y Delegaciones):
- Fila 1: Vendedores | Delegaciones (side by side)
- Fila 2: Clientes | Años | Mes inicio | Mes fin (todo en una fila)

Para comercial (sin Vendedores/Delegaciones):
- Fila única: Clientes | Años | Mes inicio | Mes fin

### Implementación en `src/pages/Dashboard.tsx`

1. Mover el bloque de Clientes dentro del `div` de filtros de periodo (líneas 182-230).
2. Cambiar el layout a `flex-row` con `items-end` para alinear todos los controles en la misma línea.
3. El filtro de Clientes ocupará el espacio flexible (`flex-1 min-w-[200px]`) mientras Años y Meses mantienen su ancho fijo.
4. En móvil, se apilará verticalmente con `flex-col sm:flex-row`.

### Archivo

| Archivo | Cambio |
|---|---|
| `src/pages/Dashboard.tsx` | Mover Clientes al lado de Años en la misma fila |

