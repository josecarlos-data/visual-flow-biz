

## Plan: 8 mejoras en Dashboard

### 1. Delegaciones y Vendedores en una sola fila
Poner ambos filtros en un `flex-row` igual que Clientes+Años. Delegaciones primero, luego Vendedores. Además, **filtrar vendedores según delegaciones seleccionadas**: cruzar con la tabla `clientes` para obtener solo los vendedores asignados a las delegaciones activas.

**Archivo**: `src/pages/Dashboard.tsx` (reorganizar líneas 170-191), `src/hooks/useHistoricoData.ts` (pasar delegaciones al hook de vendedores o filtrar en Dashboard con los datos de `rows`).

### 2. Reducir espacio en KPIs + Ticket Medio horizontal
- Reducir padding vertical de los KPI cards (`pb-0 sm:pb-1` en header, `pt-0` en content).
- Ticket Medio: poner año actual y anterior **en la misma línea** horizontal en vez de apilados. Formato: `822 € (2026) · 750 € (2025)`. Esto es viable porque hay espacio horizontal suficiente en la card a 25% del ancho.

**Archivo**: `src/pages/Dashboard.tsx`

### 3. Colores de años: verde=actual, gris=previo, naranja suave=anterior
Nueva paleta dinámica basada en el año relativo, no absoluto:
- **Año actual** (latestYear): `hsl(174, 100%, 29%)` — verde corporativo (destaca)
- **Año previo** (prevYear): `hsl(210, 20%, 60%)` — gris azulado (segundo plano)
- **Año -2**: `hsl(25, 60%, 65%)` — naranja suave/terracota (referencia discreta, no compite con el verde)

Aplicar en `MonthlyComparisonChart`, `TopClientsChart`, `SalesChart` — todos usando la misma función `getYearColor(year, latestYear)`.

**Archivos**: `src/components/MonthlyComparisonChart.tsx`, `src/components/TopClientsChart.tsx`, `src/components/SalesChart.tsx`

### 4. SalesChart: alinear colores con el resto
`SalesChart.tsx` línea 51-53 tiene colores hardcoded distintos (`hsl(174, 80%, 45%)` para 2026). Cambiar a la misma paleta dinámica.

**Archivo**: `src/components/SalesChart.tsx`

### 5. Tabla: quitar título y buscador, añadir lupa inline + modal móvil
- Eliminar `CardHeader` con "Tabla de Clientes" y el `Input` de búsqueda.
- Añadir icono de lupa junto al header "Cliente" en la tabla. Al clic, muestra un `Input` flotante inline para filtrar.
- **Móvil**: al tocar una fila, abrir un `Dialog`/`Sheet` con el nombre completo del cliente y todos los datos de esa fila (ventas por año, vendedor, delegación, etc.).

**Archivo**: `src/components/SalesTable.tsx`

### 6. Top Clientes: modal en móvil con nombre completo
En `TopClientsChart`, al tocar una barra en móvil, mostrar un tooltip/dialog con el nombre completo del cliente y el importe.

**Archivo**: `src/components/TopClientsChart.tsx`

### 7. Título: "Dashboard" → "Ventas", quitar subtítulo "Tus ventas"
Cambiar `h1` de "Dashboard" a "Ventas". Quitar o simplificar el subtítulo.

**Archivo**: `src/pages/Dashboard.tsx` (línea 131), `src/components/AppSidebar.tsx` (línea 23: title "Dashboard" → "Ventas").

### 8. Modo oscuro
- Ya existe `.dark` en `index.css` con variables definidas.
- Añadir un `ThemeProvider` context que almacene "light"/"dark" en `localStorage` y aplique/quite la clase `dark` al `<html>`.
- Añadir un botón sol/luna en el header de `AppLayout.tsx` (junto al `SidebarTrigger`).
- Los gráficos de Recharts usan `className="stroke-border"` y `className="fill-muted-foreground"` que ya responden al tema, así que deberían funcionar automáticamente.

**Archivos**: `src/hooks/useTheme.tsx` (nuevo), `src/components/AppLayout.tsx`, `src/main.tsx` (envolver con ThemeProvider).

### Resumen de archivos

| Archivo | Cambios |
|---|---|
| `src/pages/Dashboard.tsx` | Filtros en fila, KPIs compactos, ticket medio horizontal, título "Ventas" |
| `src/components/AppSidebar.tsx` | "Dashboard" → "Ventas" |
| `src/components/SalesTable.tsx` | Quitar header/buscador, lupa inline, modal móvil para fila |
| `src/components/TopClientsChart.tsx` | Colores dinámicos, modal móvil nombre completo |
| `src/components/SalesChart.tsx` | Colores dinámicos alineados |
| `src/components/MonthlyComparisonChart.tsx` | Colores dinámicos alineados |
| `src/hooks/useTheme.tsx` | Nuevo: ThemeProvider con localStorage |
| `src/components/AppLayout.tsx` | Botón modo oscuro en header |
| `src/main.tsx` | Envolver con ThemeProvider |

