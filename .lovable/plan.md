

## Plan: Ajuste de facturación quincenal en la proyección

### Contexto

La facturación es quincenal: la primera quincena se carga entre el 16-18 del mes, la segunda quincena entre el 1-3 del mes siguiente. Esto significa que el **mes en curso** probablemente solo tenga datos parciales (una quincena), lo que distorsiona la proyección al tratarlo como un mes completo.

### Solución

Modificar `src/lib/projection.ts` para detectar el mes parcial y asignarle **peso 0.5** en lugar de 1.0.

**Lógica de detección** (sin depender de comparaciones con el año anterior, que son frágiles):
1. Obtener la fecha actual (`new Date()`)
2. El mes actual del año en curso es potencialmente parcial:
   - Si estamos entre el día 1-15: el mes actual no tiene datos aún (la 1ª quincena se carga el 16-18). El mes anterior podría ser parcial si la 2ª quincena aún no se cargó (día 1-3)
   - Si estamos entre el día 16-31: el mes actual tiene solo la 1ª quincena → **mes parcial**
3. Para el mes parcial: usar solo el 50% de su peso en `sumWeightsReal`, y duplicar su valor real para estimar el mes completo antes de usarlo en el factor de escala

**Implementación concreta**:
- Añadir parámetro opcional `currentDate?: Date` a `calcularProyeccion` (para testabilidad)
- Identificar el mes parcial del año actual
- Para ese mes: en vez de contar su peso completo, contar `peso × 0.5` en `sumWeightsReal` y ajustar `totalReal` sumando `valor × 2` (estimación de mes completo)
- El resultado final para ese mes seguirá mostrando el valor real (parcial), marcado como `isProjected: false` pero con una nueva flag `isPartial: true`

### Detalle técnico

```text
Hoy = 23 mayo 2026
Mes parcial = mayo (mes 5) → solo tiene 1ª quincena

Antes:  totalReal incluye mayo completo como si fuera mes cerrado
        sumWeightsReal incluye peso_mayo × 1.0
        → scaleFactor infraestimado

Ahora:  totalReal usa mayo × 2 (estima mes completo)
        sumWeightsReal incluye peso_mayo × 1.0 (mes "completo estimado")
        → scaleFactor correcto
```

### Interfaz actualizada

```typescript
export interface ProjectionResult {
  mes: number;
  valor: number;
  isProjected: boolean;
  isPartial?: boolean;  // true si el mes tiene datos parciales (1 quincena)
}
```

### Archivos

| Archivo | Cambios |
|---|---|
| `src/lib/projection.ts` | Detectar mes parcial, ajustar peso y valor en el cálculo del scaleFactor |

