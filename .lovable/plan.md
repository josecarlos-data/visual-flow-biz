

## Plan: 5 mejoras — Configuración de fórmulas, vista comercial, sparklines y KPIs

### 1. Página de Configuración de Funciones (solo admin)

Crear nueva página `src/pages/AdminFunctions.tsx` accesible desde el sidebar en "Administración → Funciones".

**Funcionalidad**:
- Lista de funciones del sistema: Proyección, Crecimiento, Ticket Medio
- Cada función se muestra como un `Collapsible` card. Al expandir, muestra la fórmula actual en modo **vista** (fondo gris, texto monoespaciado tipo Excel)
- Botón ojo/lápiz en la esquina superior para alternar entre **vista** y **edición**
- En modo **edición**: textarea editable con la fórmula, aparecen botones **Deshacer** (RotateCcw) y **Guardar** (Save)
- Icono `?` (HelpCircle) que abre un popover/dialog con ejemplos de fórmulas en el formato del sistema:
  - Fórmula actual del sistema (lista para copiar/pegar)
  - La fórmula Excel original: `=((([@[Ventas 2025]]+([@[Ventas 2025]]/(12-Meses_restantes))*Meses_restantes+((([@[Ventas 2025]]/(12-Meses_restantes))*Meses_restantes*0.6/100)))))`
  - Formato sistema equivalente: `(ventasActual + (ventasActual / (12 - mesesConDatos)) * mesesRestantes) + ((ventasActual / (12 - mesesConDatos)) * mesesRestantes * 0.006)`
  - Una fórmula adicional de ejemplo

**Al guardar**:
1. Dialog de confirmación: "Este cambio afectará al sistema y sus cálculos. ¿Confirmar?"
2. Si confirma → intenta validar la fórmula (parseo básico de variables conocidas)
3. Si la fórmula es incompatible → propone corrección con botón que lleva de vuelta al editor con la fórmula corregida precargada
4. Si no hay corrección posible → aviso de que se podría truncar, con confirmar/cancelar final

**Nota**: En esta primera versión, las fórmulas se almacenarán en una tabla nueva `system_functions` (id, name, formula, description, updated_at). La ejecución real de fórmulas personalizadas requerirá un parser; por ahora el flujo de UI quedará completo y la fórmula guardada, pero la lógica de cálculo seguirá usando `projection.ts` hasta que se implemente el parser dinámico.

**Tabla nueva** (migración):
```sql
CREATE TABLE public.system_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  formula text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.system_functions ENABLE ROW LEVEL SECURITY;
-- Solo admin puede ver y modificar
CREATE POLICY "Admins manage functions" ON public.system_functions FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
```

Se insertarán las 3 funciones iniciales (Proyección, Crecimiento, Ticket Medio) con sus fórmulas actuales.

**Archivos**: `src/pages/AdminFunctions.tsx` (nuevo), `src/components/AppSidebar.tsx` (añadir enlace), `src/App.tsx` (añadir ruta)

### 2. Vista comercial: ocultar columna Vendedor + subtítulo con nombre

**SalesTable**: Recibir prop `hideVendedor?: boolean`. Si true, ocultar la columna Vendedor del `<TableHead>` y `<TableCell>`, y del modal móvil.

**Dashboard**: Para rol `comercial`, pasar `hideVendedor={true}` a `SalesTable`. Cambiar el subtítulo de "Resumen de ventas" a "Resumen de ventas · [nombre vendedor]". El nombre del vendedor se obtiene de `rows[0]?.vendedor` (ya que todos los datos filtrados pertenecen al mismo comercial).

**Archivos**: `src/components/SalesTable.tsx`, `src/pages/Dashboard.tsx`

### 3. ClientSparklines: acumulado, proyección y selector de años

Cuando se muestra la vista "Top 10" (Evolución Mensual por Cliente) en `MonthlyComparisonChart`, actualmente los botones de Acumulado y Proyección se ocultan (`!showClientView`). Cambiar esto para que:

- Los botones **Acumulado** y **Proyección** se muestren también en la vista de clientes
- Pasar `cumulative` y `showProjection` como props a `ClientSparklines`
- En `ClientSparklines`: si `cumulative`, acumular los valores mes a mes. Si `showProjection`, usar `calcularProyeccion` para cada cliente y mostrar la línea proyectada con trazo discontinuo
- Añadir **selector de años** dentro del gráfico: checkboxes o botones pequeños para los años disponibles, permitiendo activar/desactivar años individualmente en la vista de sparklines

**Archivos**: `src/components/MonthlyComparisonChart.tsx`, `src/components/ClientSparklines.tsx`

### 4. KPIs: reducir espaciado en todas las vistas

Actualmente los KPIs usan `p-3 sm:p-6` — el padding en desktop (`sm:p-6`) es grande. Reducir a `p-3 sm:p-4` tanto en `CardHeader` como en `CardContent` para todas las vistas. Esto hará las cards más compactas en tablet y desktop, igualando la densidad del móvil.

**Archivo**: `src/pages/Dashboard.tsx` (líneas 282-344)

### Resumen de archivos

| Archivo | Cambios |
|---|---|
| `src/pages/AdminFunctions.tsx` | Nuevo: página de configuración de fórmulas |
| `src/components/AppSidebar.tsx` | Añadir enlace "Funciones" en admin |
| `src/App.tsx` | Añadir ruta `/admin/functions` |
| `src/pages/Dashboard.tsx` | Subtítulo comercial, KPIs compactos, hideVendedor |
| `src/components/SalesTable.tsx` | Prop `hideVendedor` para ocultar columna |
| `src/components/MonthlyComparisonChart.tsx` | Mostrar botones acumulado/proyección en vista cliente |
| `src/components/ClientSparklines.tsx` | Soporte acumulado, proyección y selector de años |
| Migración SQL | Tabla `system_functions` |

