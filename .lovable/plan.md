

## Plan: Eliminar scroll horizontal en móvil

### Causa raíz

El scroll horizontal viene de dos fuentes principales:

1. **`AppLayout.tsx`**: El contenedor `flex-1` no tiene `min-w-0`, lo que permite que los hijos desborden. Además `main` tiene `p-6` fijo (24px por lado), que en una pantalla de 393px deja solo 345px para el contenido.

2. **`SalesTable.tsx`**: Muestra 3 columnas de años (2024, 2025, 2026) + Cliente = 4 columnas mínimas en móvil. Con los importes formateados como "1.234.567 €" esto desborda.

3. **Gráficos**: Los márgenes `left` en `TopClientsChart` (60px) y `SalesChart` (bottom: 70px) consumen espacio innecesario.

### Cambios

#### 1. `AppLayout.tsx` - Contener overflow desde la raíz
- Añadir `min-w-0` al div `flex-1` para que respete el ancho del padre
- Reducir padding en móvil: `p-3 sm:p-6`
- Añadir `overflow-x-hidden` al `main`

#### 2. `SalesTable.tsx` - Mostrar solo 2 años en móvil
- Ocultar columna 2024 en móvil con `hidden sm:table-cell`
- Así en móvil solo se ven: Cliente + 2025 + 2026 (2 años más recientes)
- Reducir `max-w-[200px]` del nombre de cliente a `max-w-[120px] sm:max-w-[200px]`
- Formato de importes más compacto en móvil: usar `k` para miles (ej: "123k" en vez de "123.456 €")

#### 3. `SalesChart.tsx` - Reducir márgenes
- Bottom margin en móvil: de 70 a 50
- Ángulo de etiquetas en móvil: -45 para que sean más compactas

#### 4. `TopClientsChart.tsx` - Reducir margin izquierdo
- Left margin en móvil: de 60 a 5 (el YAxis width ya controla el espacio)
- Truncar nombres a 10 chars en móvil

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/AppLayout.tsx` | `min-w-0`, padding responsive, overflow-x-hidden |
| `src/components/SalesTable.tsx` | Ocultar 2024 en móvil, nombre más corto, importes compactos |
| `src/components/SalesChart.tsx` | Reducir márgenes bottom en móvil |
| `src/components/TopClientsChart.tsx` | Reducir margin left en móvil, truncar más |

