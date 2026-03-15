

## Plan: Filtros globales, filtro por cliente, y dashboard comercial

### Problema actual
- Los filtros de mes solo afectan al grafico de comparativa mensual. Los KPIs, Top 10, SalesChart y SalesTable usan `ventas_2024/2025/2026` pre-calculados como totales anuales completos.
- El dashboard del comercial muestra graficos de "Ventas por Vendedor" y "Ventas por Delegacion" que no aportan valor (solo tiene un vendedor y una delegacion).
- No existe filtro por nombre de cliente.

### Cambios

#### 1. Filtrado global por rango de meses (`Dashboard.tsx`)

Crear un `useMemo` que recalcule los datos de `rows` filtrando `ventas_mensuales` por el rango de meses seleccionado. Esto genera nuevos `ventas_2024/2025/2026` parciales que se pasan a TODOS los componentes:

```
filteredRows = rows.map(row => {
  const filteredVentas = row.ventas_mensuales.filter(v => v.mes >= monthStart && v.mes <= monthEnd);
  return { ...row, 
    ventas_2024: sum(filteredVentas, 2024),
    ventas_2025: sum(filteredVentas, 2025),
    ventas_2026: sum(filteredVentas, 2026),
    ventas_mensuales: filteredVentas 
  };
});
```

Todos los componentes (KPIs, SalesChart, TopClientsChart, SalesTable, MonthlyComparisonChart) recibiran estos datos ya filtrados.

#### 2. Filtro por cliente (`Dashboard.tsx`)

Anadir un filtro de texto/select en la seccion de filtros que permita buscar y seleccionar clientes por nombre. Se aplicara a `filteredRows` antes de pasarlo a los componentes. Reutilizara el patron de VendedorFilter (multi-select con badges).

#### 3. Ocultar graficos irrelevantes para comerciales (`Dashboard.tsx`)

Condicionar la renderizacion de los dos `SalesChart` (vendedor y delegacion) al rol:
```
{role !== "comercial" && (
  <div className="grid gap-4 lg:grid-cols-2">
    <SalesChart ... groupBy="vendedor" />
    <SalesChart ... groupBy="delegacion" />
  </div>
)}
```

#### 4. Actualizar KPIs para usar datos filtrados

Los KPIs actualmente calculan sobre `rows` (sin filtro de mes). Cambiaran a usar `filteredRows`, de modo que "Ventas 2025" muestre solo las ventas del rango de meses seleccionado. Igualmente "Clientes Activos" contara solo los que tengan ventas en ese rango.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Dashboard.tsx` | useMemo para filtrar por meses y cliente, ocultar charts para comercial, anadir filtro cliente |
| `src/components/ComercialFilter.tsx` | Nuevo componente de filtro por cliente (o reutilizar patron existente) |

