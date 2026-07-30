## Qué trae el nuevo fichero

Verificado sobre `Maestro_ISI_-_CRM-2.xlsx`:

- `Hechos_Diarios`: 433.215 líneas → **325.498 documentos únicos** (1,33 líneas/doc), 34 columnas nuevas.
- Operación: Venta 389.907 / Abono 43.308. Tipo documento: Albarán venta 380.407, Factura contado 46.285, Abono contado 6.523.
- Canal: Mostrador/interno 380.667, Gsmart 49.088, Web 1.931, Garantías 1.468.
- Nuevos ejes: hora, almacén, vendedor de la línea (quién despachó), usuario que registró, motivo de abono, y enlace documento→documento abonado.
- `Dim_Cliente` (11.592) y `Dim_Referencia` (67.076) mantienen la misma estructura actual.

## Decisión sobre abonos (mi recomendación)

Modelo híbrido, que es el que mejor responde a tu ejemplo del volante devuelto:

- **Importe siempre neto**: el abono resta. Si el cliente devuelve, sus ventas bajan.
- **Transacciones = documentos de venta** (albarán/factura). El abono no suma transacción, pero **sí resta importe**, de modo que el ticket medio baja cuando hay devoluciones — exactamente el efecto que buscas.
- **Devoluciones como KPI propio**: nº de abonos, importe abonado y **tasa de devolución** (% sobre venta bruta), con desglose por motivo de abono, referencia y vendedor. Ahí es donde de verdad se detecta el problema (referencias que se devuelven mucho, errores de despacho de un compañero concreto).

Si prefieres contar el abono como transacción, es un cambio de una línea en la función de resumen; lo dejo parametrizable en ajustes.

## Fase 1 — Modelo de datos

1. Ampliar `ventas_diarias` con: `id_documento`, `ejercicio`, `num_documento`, `linea`, `tipo_documento`, `operacion` (Venta/Abono), `hora`, `canal`, `cod_almacen`, `almacen`, `cod_vendedor_linea`, `vendedor_linea`, `registrado_por`, `motivo_abono`, `id_doc_enlazado`, `descripcion_linea`. Índices por `(cod_cliente, ejercicio, id_documento)`, `(fecha)`, `(canal)`, `(operacion)`.
2. Nueva tabla agregada `resumen_documentos` (por cliente/año/mes/canal): nº documentos venta, nº abonos, importe neto, margen, unidades, líneas — para que los paneles sigan siendo instantáneos.
3. Ampliar `cliente_kpis` con: `num_documentos_actual/anterior`, `ticket_medio_actual/anterior`, `lineas_por_documento`, `frecuencia_compra_dias`, `num_abonos`, `importe_abonos`, `canal_principal`.
4. Actualizar `refrescar_resumenes_ventas()`, `insertar_ventas_diarias()`, `reset_maestro_isi_data()` y `panel_ventas_kpis()` con los nuevos campos, respetando permisos y `puede_ver_margen`.

## Fase 2 — Ingesta

- Actualizar `src/lib/datasets/maestroIsi.ts` para leer las 34 columnas de `Hechos_Diarios` (con parseo de hora, operación y enlaces) manteniendo el flujo por lotes y el informe por etapas.
- Cargar el fichero nuevo completo y regenerar resúmenes y KPIs.

## Fase 3 — Explotación (paneles)

**Ventas** (nuevos KPIs junto a los actuales):
- Transacciones, ticket medio, líneas por documento, unidades por documento.
- Evolución mensual de ticket medio vs año anterior.
- Mix por canal (Mostrador / Gsmart / Web / Garantías) con importe y ticket medio de cada uno — mide de verdad la adopción del canal digital.
- Panel de devoluciones: tasa, top motivos de abono, top referencias devueltas.

**Ficha de cliente**:
- Ticket medio y frecuencia de compra (días entre documentos) frente a la media de su tipo/delegación.
- Nueva pestaña **Documentos**: listado de albaranes/facturas con fecha, hora, canal, importe, nº líneas, quién lo despachó, y detalle de líneas al desplegar. Esto es lo que pedías para saber a quién reclamar.
- Alerta nueva "el cliente compra igual de veces pero gasta menos" (transacciones estables + ticket medio a la baja) frente a "compra menos veces" — diagnósticos comerciales distintos.

**Nuevas alertas en `panel_alertas`**: caída de ticket medio, caída de frecuencia, y exceso de devoluciones.

## Fase 4 — Cesta y productos relacionados (lo que preguntabas)

Con `ID Documento` ya se puede hacer análisis de cesta real:

- Vista/tabla `producto_afinidad`: pares de referencias que aparecen en el mismo documento, con soporte y confianza (calculada en batch al refrescar resúmenes, limitada al top N por referencia para que sea rápida).
- En la ficha de cliente: **"Suelen comprarse juntas y este cliente no la lleva"** → lista de referencias que sus clientes similares compran junto a lo que él ya compra. Argumentario directo de venta cruzada para el comercial.
- En el argumentario IA (`cliente-insights`): alimentar el prompt con estas oportunidades, canal habitual, ticket medio y devoluciones.

## Detalles técnicos

- Todo el cálculo pesado va en agregados regenerados por `refrescar_resumenes_ventas()`; las consultas del front solo leen resúmenes o RPCs con `LIMIT`.
- Nuevas RPCs: `cliente_documentos(_cod, _desde, _hasta)`, `panel_canales(_anio)`, `panel_devoluciones(_anio)`, `producto_relacionados(_referencia)` — todas `SECURITY DEFINER` con filtro por `clientes_permitidos` y `GRANT EXECUTE` solo a `authenticated`.
- Márgenes siguen ocultos según `puede_ver_margen`.
- Formato es-ES ya existente (`src/lib/format.ts`); ticket medio con 2 decimales, transacciones sin decimales.

Fases 1–3 son el núcleo; la Fase 4 la puedo dejar para un segundo paso si prefieres validar antes los KPIs de transacciones.
