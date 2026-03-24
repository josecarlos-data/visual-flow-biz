

## Plan: Ayuda contextual por función en AdminFunctions

### Problema
El botón de ayuda `?` es genérico y comparte el mismo popover para todas las funciones. El usuario quiere que cada función tenga su propia explicación detallada y comprensible.

### Cambios

**Archivo**: `src/pages/AdminFunctions.tsx`

1. **Mover el `HelpPopover` dentro de `FunctionCard`** y pasarle `fn.name` para renderizar contenido específico.

2. **Contenido por función**:

   **Proyección**:
   - Qué calcula: estima las ventas de los meses que aún no tienen datos para predecir el cierre del año.
   - Cómo lo hace paso a paso:
     1. Toma los meses con ventas reales del año actual (ej: enero y febrero = 1.500.000 €)
     2. Consulta el año anterior para ver qué peso tuvo cada mes (ej: si enero representó el 7% y febrero el 8%, suman 15%)
     3. Calcula el factor de escala: 1.500.000 / 0.15 = 10.000.000 € (proyección anual implícita)
     4. Para cada mes sin datos, multiplica ese factor por el peso del mes: si marzo pesó 9%, marzo proyectado = 10.000.000 × 0.09 = 900.000 €
     5. Si no hay datos del año anterior, usa pesos uniformes (1/12) con un ligero sesgo de +0,5% mensual acumulativo en el segundo semestre
   - Factor de crecimiento: No aplica un % fijo. El crecimiento viene implícito en la diferencia entre las ventas reales actuales y las del año anterior. Si en los mismos meses vendes más que el año pasado, la proyección reflejará ese crecimiento proporcionalmente.

   **Crecimiento**:
   - Qué calcula: variación porcentual entre las ventas del año actual y el anterior.
   - Fórmula: `((ventasActual - ventasPrevio) / ventasPrevio) × 100`
   - Ejemplo: si 2025 = 8M y 2024 = 7.5M → ((8M - 7.5M) / 7.5M) × 100 = 6,67%

   **Ticket Medio**:
   - Qué calcula: gasto medio por cliente activo.
   - Fórmula: `ventasActual / clientesActivos`
   - Ejemplo: 8.000.000 € / 350 clientes = 22.857 € por cliente

3. **Formato**: Cada popover incluye secciones "Qué calcula", "Cómo funciona", "Ejemplo numérico" y las variables que usa.

### Resumen

| Archivo | Cambios |
|---|---|
| `src/pages/AdminFunctions.tsx` | `HelpPopover` recibe `functionName`, renderiza explicación específica con ejemplos |

