

## Plan: Sparklines de Top 10 Clientes (comparativa mensual por cliente)

### Concepto

Un botón toggle en la esquina superior del card "Comparativa Mensual por Año". Al activarlo, se reemplaza el gráfico de líneas por año con una cuadrícula de **10 mini-gráficos (sparklines)**, uno por cada top cliente (ordenados por ventas totales). Cada sparkline muestra dos líneas superpuestas: año anterior (punteada, gris) y año actual (sólida, color primario), permitiendo ver la evolución individual de cada cliente.

### Implementación

#### 1. Nuevo componente `src/components/ClientSparklines.tsx`

- Recibe `data: ClienteConVentas[]` y calcula los top 10 clientes por ventas totales del año actual + anterior.
- Determina automáticamente el año actual (`new Date().getFullYear()`) y el anterior.
- Para cada cliente, genera datos mensuales (Ene-Dic) con las ventas de ambos años.
- Renderiza una grid (`grid-cols-2 sm:grid-cols-5`) con 10 mini-cards, cada uno conteniendo:
  - Nombre del cliente (truncado)
  - Un `LineChart` pequeño (~80px alto) con dos líneas: sólida (actual) y punteada (anterior)
  - Total del periodo debajo en texto pequeño
- Usa `ResponsiveContainer` de Recharts para cada sparkline.
- Sin ejes visibles, solo las líneas y un tooltip al hover.

#### 2. Modificar `src/components/MonthlyComparisonChart.tsx`

- Añadir un estado `showClientView: boolean` (default false).
- En el `CardHeader`, junto al título, añadir un botón/toggle con icono `Users` que alterne entre la vista por año y la vista por cliente.
- Cuando `showClientView === true`, renderizar `<ClientSparklines>` en lugar del `LineChart` actual.
- El título cambia dinámicamente: "Comparativa Mensual por Año" / "Evolución Mensual por Cliente".

#### 3. Diferenciación visual año actual vs anterior

- Año anterior: línea punteada (`strokeDasharray="5 5"`), color gris (`hsl(210, 15%, 55%)`)
- Año actual: línea sólida, color primario del tema (`hsl(174, 100%, 29%)`)
- Leyenda simple: "2024" (punteada) / "2025" (sólida) en la parte superior

### Archivos

| Archivo | Cambio |
|---|---|
| `src/components/ClientSparklines.tsx` | Crear: grid de sparklines top 10 clientes |
| `src/components/MonthlyComparisonChart.tsx` | Añadir toggle para alternar entre vista año y vista cliente |

