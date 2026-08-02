## Objetivo

Dos arreglos en la sección Objetivos: que cada comercial vea solo lo suyo, y rehacer el gráfico para que sea legible en móvil.

## 1. Visibilidad por comercial

Hoy `objetivos_seguimiento` devuelve todos los objetivos del año a cualquier usuario aprobado, por eso Bautista ve a sus compañeros.

Regla nueva:
- **Admin** y **Director comercial** (jefe de ventas / gerencia): ven todos los objetivos, con el filtro de comercial que ya existe.
- **Cualquier otro rol** (comercial, encargado de tienda, jefe de zona): ve únicamente los objetivos cuyo vendedor coincide con su ficha de usuario (el mismo campo que ya filtra clientes y ventas, p. ej. "J. Antonio Bautista").

Se aplica en la base de datos, no solo en pantalla, así que también quedan protegidos `objetivos_propuesta` y la lectura directa de la tabla `objetivos` (edición solo admin/director).

En la pantalla de Objetivos, el selector "Todos los comerciales" solo aparece para admin/director.

## 2. Gráfico mensual combinado

El gráfico actual dibuja 24 quincenas × 3 barras: en 411 px cada barra queda por debajo de 1 px, por eso se ve en blanco aunque el tooltip sí muestre importes.

Nuevo diseño (12 puntos, uno por mes):
- **2025**: barras grises suaves de fondo.
- **2026 real**: línea continua en el turquesa corporativo, con puntos en cada mes.
- **2026 proyectado**: la misma línea continuada en discontinuo (guiones/puntos), arrancando desde el último mes real para que no haya hueco.
- Mes parcial (primera quincena facturada, segunda no): se muestra el real acumulado y el tooltip lo marca como "parcial".
- Ejes Ene…Dic, importes en miles, altura algo mayor y leyenda compacta.

El motor de proyección sigue calculando internamente por quincenas; solo cambia la presentación.

Mismo criterio en la tarjeta resumen del panel de Ventas.

## Sobre los roles

No toco el catálogo de roles todavía. Este cambio ya deja la jerarquía práctica que describes: comercial/encargado = solo lo suyo, director comercial = todo, admin = todo + configuración. `jefe_de_zona` pasa a comportarse como comercial en Objetivos; cuando quieras lo retiramos en una limpieza aparte.

## Detalle técnico

- Migración: recrear `public.objetivos_seguimiento(_anio)` filtrando por `public.get_user_employee_code(auth.uid())` salvo `is_admin` / `has_role('director_comercial')`; alinear las políticas RLS de `objetivos`.
- `src/lib/projectionQuincenal.ts`: helper `agruparPorMes(puntos)` → 12 registros con `anterior`, `real`, `proyectado` (con solape en el mes de corte) y flag `parcial`.
- `src/components/ObjetivoCard.tsx`: `ComposedChart` de recharts (Bar 2025 + Line real + Line dashed proyección), colores por tokens del design system.
- `src/pages/Objetivos.tsx`: ocultar el selector de comercial a quien no sea admin/director.
- Pruebas unitarias de `agruparPorMes` en `src/test/projectionQuincenal.test.ts`.
