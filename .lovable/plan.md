

## Plan: 4 mejoras en Dashboard

### 1. Formato de miles — separador desde unidades de millar

**Problema**: `Intl.NumberFormat("es-ES")` ya debería formatear `7859` como `7.859`, pero con `maximumFractionDigits: 0` puede omitir separadores en algunos casos. Revisaré todas las funciones `fmt` del proyecto.

**Solución**: Verificar y corregir las funciones `fmt` en `Dashboard.tsx`, `SalesChart.tsx`, `MonthlyComparisonChart.tsx`, `ClientSparklines.tsx`, `TopClientsChart.tsx` y `SalesTable.tsx`. El formato `es-ES` con `useGrouping: true` (por defecto) debería funcionar. Si no, forzar `useGrouping: true` explícitamente.

**Archivos**: Todos los que tengan funciones `fmt`.

### 2. Sparklines tooltip — meses 1-12 en vez de 0-11

**Problema**: El tooltip muestra el índice del array (0-11) en lugar del nombre del mes. El `labelFormatter` usa `label` directamente, que es el campo `mes` del data (un string de MONTH_NAMES, pero el tooltip muestra el índice).

**Solución**: En `ClientSparklines.tsx`, el `Tooltip` usa `labelFormatter={(label) => label}` pero el `LineChart` no tiene `XAxis` visible, así que Recharts usa el índice. Cambiar para que use el campo `mes` de los datos como label: añadir `labelFormatter={(_, payload) => payload?.[0]?.payload?.mes || ""}`.

**Archivo**: `src/components/ClientSparklines.tsx`

### 3. Combinar gráficos Vendedor/Delegación con toggle

**Problema**: Actualmente son dos gráficos side-by-side que ocupan mucho espacio.

**Solución**: Reemplazar los dos `SalesChart` en `Dashboard.tsx` por un único card con un toggle (botones "Vendedor" / "Delegación") similar al patrón de `MonthlyComparisonChart`. Refactorizar `SalesChart.tsx` para aceptar un modo interno conmutable, o bien manejar el estado desde Dashboard y renderizar un solo `SalesChart` cambiando `groupBy`.

**Implementación**: En `Dashboard.tsx`, añadir estado `salesGroupBy: "vendedor" | "delegacion"` y renderizar un solo `Card` con dos botones en el header + un `SalesChart` cuyo `groupBy` cambia dinámicamente.

**Archivos**: `src/pages/Dashboard.tsx`

### 4. Filtro de clientes — ordenación por importe + mostrar ventas

**Problema**: El dropdown de clientes solo muestra nombres en orden alfabético.

**Solución**: 
- Cambiar `ClienteFilter` para recibir datos con importes: `clientes: { name: string; ventas: number }[]` en lugar de `string[]`.
- Añadir un mini-toggle (icono o botón) dentro del `Popover` para alternar entre orden alfabético (A-Z) y por importe (↓€).
- Mostrar el importe del año anterior en texto pequeño a la derecha de cada nombre.
- En `Dashboard.tsx`, construir el array de clientes con las ventas del `prevYear` desde `rows`.

**Archivos**: `src/components/ClienteFilter.tsx`, `src/pages/Dashboard.tsx`

### Resumen de archivos

| Archivo | Cambios |
|---|---|
| `src/components/ClientSparklines.tsx` | Fix tooltip label (mes 1-12), verificar fmt |
| `src/components/ClienteFilter.tsx` | Nueva prop con importes, toggle orden A-Z / €, mostrar importe |
| `src/pages/Dashboard.tsx` | Combinar vendedor/delegación en toggle, pasar datos con importes al filtro |
| `src/components/SalesChart.tsx` | Verificar fmt |
| `src/components/MonthlyComparisonChart.tsx` | Verificar fmt |
| `src/components/TopClientsChart.tsx` | Verificar fmt |
| `src/components/SalesTable.tsx` | Verificar fmt |

