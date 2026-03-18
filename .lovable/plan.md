

## Plan: Mejoras en Top 10 Clientes y KPIs

### 1. Top 10 Clientes — Selector de año con botones

**Cambio en `TopClientsChart.tsx`:**
- Añadir 3 botones (2024, 2025, 2026) junto al título, con el último año preseleccionado por defecto.
- Al pulsar un año, el ranking se recalcula ordenando por `ventas_XXXX` del año seleccionado.
- Las barras cambiarán de color según el año (reutilizando los colores de `YEAR_COLORS` ya definidos en el proyecto).
- El título se actualiza dinámicamente: "Top 10 Clientes (2025)".

**Componente necesita recibir prop adicional:** ninguno — ya tiene acceso a `ventas_2024`, `ventas_2025` y `ventas_2026` en los datos.

### 2. KPIs — Reemplazar "Crecimiento" y "Proyección 2026" por métricas más dinámicas

Los KPIs actuales "Proyección 2026" y "Crecimiento" son estáticos (datos precargados). Alternativas que aportan más valor real:

| KPI actual | Propuesta | Qué muestra |
|---|---|---|
| **Proyección 2026** | **Ventas año anterior** | Total ventas 2024 en el rango seleccionado. Permite comparar directamente con 2025. |
| **Crecimiento (fijo 24→25)** | **Crecimiento dinámico** | Compara los dos últimos años con datos según el rango de meses seleccionado (ej: si filtras Ene-Mar, compara solo Ene-Mar de cada año). La etiqueta se actualiza: "2024 vs 2025" o "2025 vs 2026". |

Así los 4 KPIs quedarían:
1. **Ventas [último año]** — total del año más reciente con datos
2. **Ventas [año anterior]** — total del año previo (mismo rango de meses)
3. **Clientes Activos** — con ventas en el último año
4. **Crecimiento** — % variación entre los dos años, calculado dinámicamente según filtros

Todos se recalculan automáticamente según los filtros de meses y clientes activos.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/TopClientsChart.tsx` | Añadir estado para año seleccionado + 3 botones toggle |
| `src/pages/Dashboard.tsx` | Reemplazar KPIs de Proyección y Crecimiento por versiones dinámicas |

