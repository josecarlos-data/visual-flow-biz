

## Plan: 4 mejoras en Dashboard

### 1. KPI "Ventas [último año]" — coletilla dinámica de clientes

**Problema**: La línea "312 clientes (en 2025)" no varía al cambiar meses. Muestra `filteredRows.length` (total de filas) en vez de los clientes activos en ese rango.

**Solución**: Reemplazar `filteredRows.length` por `kpis.clientesActivos` para que el número refleje solo clientes con ventas >0 en el año y rango seleccionado.

**Archivo**: `src/pages/Dashboard.tsx` línea 250

### 2. KPI "Clientes Activos" → reemplazar por **Ticket Medio**

**Propuesta**: Sustituir "Clientes Activos" (dato ya visible en el KPI anterior) por **Ticket Medio** = Ventas último año ÷ Clientes activos. Muestra el importe medio por cliente, útil para detectar si el crecimiento viene de más clientes o de mayor facturación por cliente. La coletilla mostrará "por cliente activo".

**Archivo**: `src/pages/Dashboard.tsx` — calcular `ticketMedio` en el useMemo de kpis y renderizar en el tercer card.

### 3. Sparklines "Evolución Mensual por Cliente" — respetar filtros globales

**Problema**: El componente `ClientSparklines` usa `new Date().getFullYear()` fijo, ignorando `selectedYears` y `monthRange`.

**Solución**: 
- Pasar `selectedYears` y `monthRange` como props desde `MonthlyComparisonChart`.
- Usar el último y penúltimo año de `selectedYears` para las líneas current/prev.
- Filtrar datos mensuales al rango `monthRange`.

**Archivos**: `src/components/ClientSparklines.tsx`, `src/components/MonthlyComparisonChart.tsx`

### 4. Top 10 Clientes — optimizar espacio y legibilidad

**Problema**: Nombres truncados con mucho espacio en blanco a la izquierda. El `YAxis width` fijo (95px desktop) no aprovecha el espacio.

**Solución**:
- Aumentar `YAxis width` a ~140px en desktop para mostrar nombres más completos.
- Aumentar `maxLen` de 25 a 35 y `truncLen` de 22 a 32.
- Reducir margen izquierdo del chart (`left: 5` en todos los casos, ya que el YAxis width controla el espacio real).
- Aumentar altura del gráfico de 350px a 400px para dar más espacio vertical a cada barra.
- Usar `tick fontSize: 12` en desktop (era 11).

**Archivo**: `src/components/TopClientsChart.tsx`

### Resumen de archivos

| Archivo | Cambios |
|---|---|
| `src/pages/Dashboard.tsx` | KPI1: coletilla con clientesActivos. KPI3: Ticket Medio reemplaza Clientes Activos |
| `src/components/ClientSparklines.tsx` | Recibir y usar selectedYears + monthRange como props |
| `src/components/MonthlyComparisonChart.tsx` | Pasar selectedYears y monthRange a ClientSparklines |
| `src/components/TopClientsChart.tsx` | Ampliar YAxis width, maxLen, reducir margins, más altura |

