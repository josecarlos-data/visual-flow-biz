

## Plan: Optimizar layout mobile del Dashboard - sin scroll horizontal

### Problemas visibles en los screenshots

1. **Filtro de Vendedores**: Los checkboxes ocupan demasiado espacio vertical en movil, mostrando 13 vendedores como chips individuales.
2. **KPIs**: Cada tarjeta ocupa el 100% del ancho en movil, generando mucho scroll vertical. En movil podrian caber 2 por fila.
3. **Filtros de Periodo**: Ocupan una card entera separada con espacio desaprovechado.

### Cambios planificados

#### 1. Vendedores como Select multi-seleccion desplegable (`Dashboard.tsx`)

Reemplazar los checkboxes de vendedores por un `Select` desplegable similar al de Delegaciones: al seleccionar, se muestran como badges compactos debajo. Esto reduce el espacio de 13 chips a 1 linea con un dropdown.

- Crear un componente inline o reutilizar el patron de `DelegacionFilter`
- Los vendedores seleccionados se muestran como badges pequenos con boton X
- Cuando no hay seleccion, solo se ve el dropdown cerrado

#### 2. Consolidar filtros en una sola Card colapsable (`Dashboard.tsx`)

Unir los filtros (Vendedores, Delegaciones, Periodo/Anos/Meses) en una unica Card con un `Collapsible` que se puede abrir/cerrar. En movil arranca cerrado mostrando solo un resumen de filtros activos.

#### 3. KPIs en grid 2x2 en movil (`Dashboard.tsx`)

Cambiar el grid de KPIs de `grid-cols-1` (movil actual) a `grid-cols-2` en movil. Reducir padding y tamano de fuente del valor para que quepan 2 por fila:
- `grid-cols-2 lg:grid-cols-4`
- Texto del valor: `text-xl sm:text-2xl`
- Padding reducido en CardHeader/CardContent

#### 4. Eliminar scroll horizontal

- Asegurar `overflow-x-hidden` o `max-w-full` en el contenedor principal
- Revisar que ningun elemento tenga ancho fijo que desborde

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Dashboard.tsx` | Vendedores como dropdown, filtros en card colapsable, KPIs 2x2 en movil |

