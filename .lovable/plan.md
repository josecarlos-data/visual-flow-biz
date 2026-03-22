

## Plan: 3 mejoras en Dashboard

### 1. Botón "Borrar filtros"

Añadir un botón en la cabecera de la card de Filtros (junto al badge de filtros activos) que resetee todo:
- `selectedVendedores → []`
- `selectedDelegaciones → []`
- `selectedClientes → []`
- `selectedYears → [2024, 2025, 2026]`
- `monthStart → 1`, `monthEnd → 12`

Solo visible cuando hay algún filtro activo (clientes seleccionados, vendedores, meses parciales, etc.). Icono de `X` o `RotateCcw` con texto "Limpiar".

**Archivo**: `src/pages/Dashboard.tsx`

### 2. Colores de años más diferenciados

Los colores actuales son:
- 2024: `hsl(210, 15%, 55%)` — gris azulado
- 2025: `hsl(174, 100%, 29%)` — verde oscuro
- 2026: `hsl(160, 60%, 45%)` — verde claro

El problema es que 2025 y 2026 son ambos verdes y se confunden. Propuesta manteniendo la estética corporativa verde pero con más contraste:

- **2024**: `hsl(210, 20%, 60%)` — gris azulado (mantener, ya se diferencia bien)
- **2025**: `hsl(174, 100%, 29%)` — verde corporativo intenso (mantener)
- **2026**: `hsl(45, 90%, 50%)` — dorado/ámbar — se diferencia claramente del verde y aporta un acento cálido

Alternativa si no te gusta el dorado: `hsl(270, 50%, 55%)` (violeta suave). El objetivo es que ningún par de líneas se confunda.

**Archivos**: `src/components/MonthlyComparisonChart.tsx`, `src/components/TopClientsChart.tsx`

### 3. KPIs — subtítulos mejorados + ticket medio dual

**KPI "Ventas año anterior"** (línea 268): Cambiar "Mismo rango de meses" por el conteo de clientes activos de ese año, igual que el primer KPI. Calcular `clientesActivosPrev` en el useMemo de kpis.

**KPI "Ticket Medio"**: Actualmente se calcula sobre el `latestYear` (año más reciente seleccionado, ej: 2026). Propuesta:
- Mantener el ticket medio del año actual (latestYear) como valor principal
- Debajo, mostrar en pequeño el ticket medio del año anterior para comparar
- Formato:
  ```
  822 €          ← ticket medio latestYear
  2026 · prev: 750 € (2025)
  ```
- Se calcula: `ticketMedioPrev = totalPrev / clientesActivosPrev`

**Archivo**: `src/pages/Dashboard.tsx`

### Resumen de archivos

| Archivo | Cambios |
|---|---|
| `src/pages/Dashboard.tsx` | Botón borrar filtros, KPI prev con clientes activos, ticket medio dual |
| `src/components/MonthlyComparisonChart.tsx` | Color 2026 más diferenciado |
| `src/components/TopClientsChart.tsx` | Color 2026 más diferenciado |

