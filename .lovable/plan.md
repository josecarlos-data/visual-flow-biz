

## Plan: 3 mejoras — KPI Ticket Medio, Acumulado mensual, Proyección

### 1. KPI Ticket Medio — salto de línea forzado

Cambiar el layout actual (todo en `flex-wrap` horizontal con separador `·`) a dos líneas explícitas:
- **Línea 1**: `822 €` (grande, bold) + `2026` (pequeño, muted) 
- **Línea 2**: `750 €` (más pequeño, semibold, muted) + `2025` (pequeño, muted)

Quitar el `·` separador. Usar `flex-col` en vez de `flex-wrap`.

**Archivo**: `src/pages/Dashboard.tsx` (líneas 317-328)

### 2. Comparativa Mensual — modo acumulado

Añadir un botón "Acumulado" / "Mensual" en el header del chart (junto a los botones existentes "Por año" / "Top 10"). Cuando se activa:
- Los datos se transforman con `reduce` para que cada mes muestre la suma acumulada desde el mes de inicio hasta ese mes.
- La línea resultante es ascendente, permitiendo ver la tendencia de acumulación entre años.

Estado: `const [cumulative, setCumulative] = useState(false)`.  
Transformación: un segundo `useMemo` que, si `cumulative`, recorre `chartData` y acumula `ventas_XXXX` mes a mes.

**Archivo**: `src/components/MonthlyComparisonChart.tsx`

### 3. Proyección del año actual

**Método de proyección**: Extrapolación lineal simple con ajuste estacional ligero.
- Calcular la media mensual de los meses con datos reales del año actual.
- Multiplicar por 12 para obtener la proyección anual.
- Aplicar un factor de estacionalidad: usar la distribución mensual del año anterior como referencia. Si en el año anterior el mes M representó X% del total anual, escalar la proyección del mes M proporcionalmente. Si no hay datos del año anterior suficientes, usar distribución uniforme con un +3% de crecimiento tendencial en el segundo semestre (basado en patrones típicos de B2B industrial).

**Implementación**:
- En `MonthlyComparisonChart`: nuevo estado `showProjection` (toggle/slider junto a la leyenda del año actual). Cuando activo, se añade una línea adicional `proyeccion_XXXX` con trazo discontinuo (`strokeDasharray="5 5"`). Los meses con datos reales mantienen el valor real; los meses sin datos muestran el valor proyectado.
- En `SalesChart`: toggle similar "Real / Proyección" para el año actual. Se recalculan los totales por vendedor/delegación sumando la proyección de los meses faltantes.
- La lógica de proyección se centraliza en una función util `calcularProyeccion(ventasMensuales, yearActual, yearPrevio)` en un nuevo archivo `src/lib/projection.ts`.

**Detalle del cálculo** (en `projection.ts`):
1. Identificar meses con datos reales del año actual (valor > 0).
2. Obtener el perfil estacional del año anterior (% de cada mes sobre el total anual).
3. Para cada mes sin datos: `proyeccion_mes = (total_real / suma_pesos_meses_reales) * peso_mes_objetivo`, donde `peso_mes` viene del perfil estacional.
4. Si no hay año anterior completo, usar pesos uniformes (1/12) con un ligero sesgo ascendente (+0.5% mensual acumulativo en H2).

**Justificación**: Este método es superior a la simple regla de tres (`total/meses_reales * 12`) porque respeta la estacionalidad real del negocio. Si históricamente diciembre es un mes fuerte, la proyección lo refleja. Es simple, interpretable y no requiere modelos estadísticos complejos.

**Archivos**: 
| Archivo | Cambios |
|---|---|
| `src/pages/Dashboard.tsx` | KPI ticket medio con `flex-col` |
| `src/components/MonthlyComparisonChart.tsx` | Toggle acumulado + toggle proyección con línea discontinua |
| `src/components/SalesChart.tsx` | Toggle proyección para año actual |
| `src/lib/projection.ts` | Nuevo: función de proyección estacional |

