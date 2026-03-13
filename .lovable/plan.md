

## Plan: Hacer los graficos y el dashboard responsive para movil, tablet y escritorio

### Problemas actuales
- Los graficos tienen alturas fijas (`h-[350px]`) que no se adaptan a pantallas pequenas.
- `SalesChart` usa `interval={0}` en el eje X, forzando todas las etiquetas aunque no quepan en movil.
- `TopClientsChart` tiene `left: 100` margin fijo que ocupa demasiado en pantallas pequenas.
- La tabla de clientes tiene un buscador con ancho fijo (`w-64`) que desborda en movil.
- Los filtros del dashboard usan `flex-wrap` pero no ajustan el layout vertical en movil.
- El grid de graficos (`lg:grid-cols-2`) esta bien para desktop pero los graficos individuales no se adaptan internamente.

### Cambios planificados

#### 1. `SalesChart.tsx` - Responsive bar chart
- Reducir altura en movil: `h-[280px] sm:h-[350px]`
- Usar `interval="preserveStartEnd"` en lugar de `interval={0}` para que Recharts oculte etiquetas solapadas en pantallas pequenas
- Reducir angulo de etiquetas y font size en movil mediante un hook `useIsMobile`
- Reducir margenes en pantallas pequenas

#### 2. `MonthlyComparisonChart.tsx` - Responsive line chart
- Altura responsive: `h-[280px] sm:h-[350px]`
- Reducir margenes laterales en movil

#### 3. `TopClientsChart.tsx` - Responsive horizontal bar chart
- Altura responsive: `h-[300px] sm:h-[350px]`
- Reducir `left` margin y `YAxis width` en movil (de 100/95 a 60/55)
- Truncar nombres de cliente mas agresivamente en movil

#### 4. `SalesTable.tsx` - Responsive table
- Hacer el header del card apilable en movil: `flex-col sm:flex-row`
- Buscador a ancho completo en movil: `w-full sm:w-64`
- Ocultar columnas secundarias en movil (Vendedor, Delegacion, Proyeccion, Crecimiento) con clases `hidden md:table-cell`

#### 5. `Dashboard.tsx` - Layout responsive
- Filtros de periodo: layout vertical en movil con `flex-col sm:flex-row`
- KPIs: ya usan `md:grid-cols-2 lg:grid-cols-4`, correcto

### Resumen de archivos

| Archivo | Cambio |
|---|---|
| `src/components/SalesChart.tsx` | Altura, intervalo ejes y margenes responsive |
| `src/components/MonthlyComparisonChart.tsx` | Altura y margenes responsive |
| `src/components/TopClientsChart.tsx` | Altura, margenes y truncado responsive |
| `src/components/SalesTable.tsx` | Header apilable, buscador full-width, columnas ocultas en movil |
| `src/pages/Dashboard.tsx` | Filtros de periodo responsive |

