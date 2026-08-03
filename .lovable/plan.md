## Diagnóstico (verificado en datos, J. Antonio Bautista, 2026)

- Facturación panel de ventas: **891.956 €**
- Objetivos: cartera 667.622 € + ruta JAB2026 169.191 € = **836.813 €**
- Diferencia: **55.143 €**

Las ventas reales de 2026 de ese comercial son 707.042 € (cartera) + 184.914 € (JAB2026) = 891.956 €, o sea el reparto por objetivo es correcto y cuadra con la facturación.

La diferencia es exactamente lo facturado entre el **16 y el 29 de julio** (última fecha cargada): 39.419 € cartera + 15.724 € JAB2026 = 55.143 €. La tarjeta de objetivo suma solo quincenas **cerradas** (corte quincena 13, hasta 15/07); el KPI de facturación suma todo lo cargado.

## 1. Cuadrar los totales de objetivos

- "Vendido" en la tarjeta de objetivo y en el resumen del panel pasa a ser el **acumulado real completo del año**, incluida la quincena en curso. Así la suma de objetivos cuadra siempre con la facturación.
- La proyección sigue calculándose **solo con quincenas cerradas** (criterio correcto), sumándole después lo ya facturado de la quincena abierta sin duplicar.
- % logrado, progreso, variación vs año anterior y "Falta" se recalculan sobre el vendido real.
- El gráfico mensual muestra la parte real de la quincena abierta como dato real (mes marcado como parcial en el tooltip), no como proyección.
- **Sin subtexto explicativo** en la tarjeta: nada de "incluye X € de la quincena en curso". La explicación vivirá en Funciones.

## 2. KPIs del panel de ventas en móvil

- Rejilla de 2 columnas en móvil (hoy 1 por fila), 3–4 en escritorio.
- Tarjetas KPI compactas: paddings y tipografía reducidos en móvil, icono + etiqueta en una línea, valor destacado y subtexto en una línea con truncado.
- Escalado del tamaño del valor para importes largos (891.956 €) sin cortes.
- Mismo tratamiento en las tarjetas del resumen de objetivos.

## 3. Sección Funciones: explicación clara, sin Excel

- **Se elimina por completo la equivalencia en fórmula de Excel** de la interfaz (campo, editor y copiado). El dato de la base se deja de mostrar y de editar.
- Cada función pasa a mostrar tres bloques:
  1. **Qué calcula** — explicación en lenguaje llano, una o dos frases.
  2. **Cómo se calcula** — la fórmula interna (editable por admin, como ahora).
  3. **Ejemplo** — caso numérico sencillo y realista con el resultado, listo para explicárselo a un compañero.
- Se documentan las funciones en uso, incluida la **proyección de ventas quincenal**: qué es el corte de quincena, por qué solo se usan quincenas cerradas para proyectar, y ejemplo del tipo "vendido hasta 15/07 = 667.622 €, ese periodo pesó el 51,3 % del año anterior → proyección de cierre ≈ 1.300.000 €".
- También: clientes activos, ticket medio, tasa de devolución, variación YTD, ritmo necesario por quincena y objetivo de cartera vs rutas especiales.

## Detalles técnicos

- `src/lib/projectionQuincenal.ts`: `calcularProyeccionQuincenal` devuelve además `vendidoTotal` (todas las quincenas con dato) y `parcialImporte`; `vendido` sigue siendo el cerrado para el cálculo de pesos.
- `src/components/ObjetivoCard.tsx` y `src/components/ResumenObjetivos.tsx`: usar `vendidoTotal` en KPI, progreso, variación y "Falta".
- `agruparPorMes`: incorporar la quincena parcial como real en su mes.
- `src/pages/Ventas.tsx`: rejilla `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` y variante compacta de la tarjeta KPI.
- `src/pages/AdminFunctions.tsx`: quitar `excel_equivalent` de UI, editor y guardado; añadir bloques de explicación y ejemplo (usando `description` para la explicación y un campo/`ejemplo` para el caso práctico).
- Migración mínima si hace falta: columna `ejemplo` en `system_functions` y relleno de explicaciones/ejemplos por función.
- Ampliar `src/test/projectionQuincenal.test.ts` con el caso de quincena parcial.
