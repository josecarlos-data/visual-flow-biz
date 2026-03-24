

## Plan: Conectar AdminFunctions con las fórmulas reales del sistema

### Problema actual
La página de Funciones muestra fórmulas genéricas almacenadas en `system_functions` que NO corresponden exactamente al código real ejecutado en `projection.ts` y `Dashboard.tsx`. El usuario quiere ver las fórmulas reales y su equivalente Excel.

### Enfoque

**Cada función mostrará dos bloques:**
1. **Bloque principal**: La fórmula real del sistema tal como se ejecuta en el código, en formato legible (pseudo-código matemático)
2. **Bloque secundario pequeño**: La equivalencia en formato Excel, en un recuadro gris más pequeño con etiqueta "Equivalente Excel"

**Actualizar los datos en `system_functions`** para que reflejen las fórmulas REALES:

| Función | Fórmula real (código) | Excel equivalente |
|---|---|---|
| **Proyección** | `Para cada mes sin datos: proyeccion_mes = (totalReal / Σ pesos_meses_reales) × peso_mes. Pesos = ventasPrevio[mes] / totalPrevio. Sin datos previos: peso = (1/12) × (1 + 0.005 × max(0, mes-6))` | `=((([@[Ventas 2025]]+([@[Ventas 2025]]/(12-Meses_restantes))*Meses_restantes+((([@[Ventas 2025]]/(12-Meses_restantes))*Meses_restantes*0.6/100)))))` |
| **Crecimiento** | `((ventasActual - ventasPrevio) / ventasPrevio) × 100` | `=[@[Ventas 2026]]/[@[Ventas 2025]]-1` |
| **Ticket Medio** | `ventasActual / clientesActivos` | `=[@[Total Ventas]]/[@[Clientes Activos]]` |

### Cambios en AdminFunctions.tsx

1. **Añadir campo `excel_equivalent`** a la tabla `system_functions` (migración) para almacenar la fórmula Excel por separado
2. **Rediseñar `FunctionCard`**:
   - Bloque principal grande: fórmula del sistema (monoespaciada, fondo claro)
   - Debajo, bloque secundario más pequeño con borde punteado: "📊 Excel: `=...`"
   - En modo edición, ambos campos son editables
3. **Actualizar los 3 registros existentes** con las fórmulas reales del código (`projection.ts` líneas 68-80 para Proyección, `Dashboard.tsx` línea 116 para Crecimiento, línea 119 para Ticket Medio)
4. **Popover de ayuda**: actualizar para mostrar las variables reales usadas y la correspondencia código↔Excel

### Cambios en la base de datos

**Migración**: Añadir columna `excel_equivalent text` a `system_functions`.

**Actualización de datos** (via insert tool):
- Proyección: fórmula real = descripción del algoritmo estacional de `projection.ts`, excel = la fórmula original del usuario
- Crecimiento: fórmula real = `((ventasActual - ventasPrevio) / ventasPrevio) * 100`, excel = `=[@[Ventas 2026]]/[@[Ventas 2025]]-1`
- Ticket Medio: fórmula real = `ventasActual / clientesActivos`, excel = `=[@[Total Ventas]]/[@[Clientes Activos]]`

### Resumen de archivos

| Archivo | Cambios |
|---|---|
| `src/pages/AdminFunctions.tsx` | Rediseñar FunctionCard con bloque dual (sistema + Excel), actualizar interfaz y popover de ayuda |
| Migración SQL | Añadir columna `excel_equivalent` a `system_functions` |
| Data update | Actualizar las 3 funciones con fórmulas reales del código |

### Nota sobre edición dinámica
Por ahora, editar la fórmula en la UI la guarda en BD pero NO cambia automáticamente el código de `projection.ts`. Esto requeriría un parser de fórmulas dinámico (fase futura). La página sirve como **documentación viva y editable** de las fórmulas, con el flujo de confirmación ya implementado.

