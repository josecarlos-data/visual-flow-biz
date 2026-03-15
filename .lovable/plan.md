

## Plan: Formato español de moneda consistente

### Cambios

#### 1. `src/components/SalesTable.tsx` - Tabla con 2 decimales, separador de miles español
- Reemplazar `fmtFull` y `fmtCompact` por un único formateador: `new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` + " €"
- Eliminar la lógica `isMobile ? fmtCompact : fmtFull` — siempre usar el mismo formato con punto como separador de miles y 2 decimales (ej: "1.234.567,89 €")

#### 2. `src/pages/Dashboard.tsx` - KPIs con 0 decimales, separador de miles español
- Cambiar `fmt` a `maximumFractionDigits: 0` (ya lo tiene, verificar que usa punto como separador de miles — `es-ES` lo hace por defecto)

#### 3. `src/components/SalesChart.tsx`, `MonthlyComparisonChart.tsx`, `TopClientsChart.tsx` - Tooltips y ejes con 0 decimales
- Los `fmt` de tooltips ya usan `maximumFractionDigits: 0` — confirmar
- Los ejes YAxis/XAxis que usan `toFixed(0)}k` se mantienen como abreviación en ejes (solo afecta a tick labels, no a tooltips)

### Resumen de formatos

| Ubicación | Formato | Ejemplo |
|---|---|---|
| Tabla de clientes | 2 decimales, separador miles | 1.234.567,89 € |
| KPIs, tooltips, gráficos | 0 decimales, separador miles | 1.234.568 € |
| Ejes de gráficos (ticks) | Abreviado | 1.235k |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/SalesTable.tsx` | Formato único con 2 decimales, quitar lógica "k" |
| `src/pages/Dashboard.tsx` | Verificar fmt (ya correcto) |
| `src/components/SalesChart.tsx` | Verificar fmt tooltip (ya correcto) |
| `src/components/MonthlyComparisonChart.tsx` | Verificar fmt tooltip |
| `src/components/TopClientsChart.tsx` | Verificar fmt tooltip |

