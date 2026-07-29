## Qué dicen los datos (11.592 clientes analizados)

Relleno real de cada campo dudoso:

| Campo | Relleno | Valor real |
|---|---|---|
| Cif | 0% | vacío (censurado) |
| Extensión | 8%, 38 valores | subcódigos de sucursal/dirección de entrega — sin uso analítico hoy |
| Estado | 100% | 11.584 Activo / 8 Baja → **inútil** para saber quién compra; el "activo" real lo da la última venta |
| Ruta Comercial | 56%, 401 rutas | útil (GU0MO, MA0MO…) |
| Cód. Delegación / Delegación | 99%, 5 valores | Granada, Almería, Guarromán, Málaga (+1) |
| Cód. Vendedor / Vendedor | 99% / 64%, 15-16 valores | el código está siempre; el nombre falta en 36% (los que tienen cód. 0 = 4.114 sin comercial) |
| Cód. Tipo cliente / Tipo cliente | 99% | son el mismo dato: A/B/C/D ↔ "TC A/B/C/D" → basta el código |
| Clasificac. abc | 5 filas | **vacío** |
| Nº empleados taller | 100% pero 11.559 son 0 | dato muerto en la práctica (33 clientes con valor) |
| Observaciones almacén | 49 filas | anecdótico ("MUY CARO", notas de abono) |
| Fecha de alta | 99% | útil: permite antigüedad y detectar clientes nuevos |
| Motivo/Fecha de baja | 8 y 0 filas | irrelevante |
| Prohibic. venta | 72%, 113 valores | **relevante de verdad**: 5.998 "CLIENTE DESACTUALIZADO", 1.408 "PROHIBICION DE VENTA", 795 "AVISAR A ADMINISTRACION" → bandera comercial clara |
| Modo de pago / entrega / Serie / Pedido obligatorio | altos pero casi constantes | operativos, no comerciales |
| Rappel (cód., grupo, tramos, nº, aviso) | 56 clientes | testimonial, pero interesante para esos 56 |
| Grupo | 4%, 230 valores | grupos empresariales / cadenas → útil aunque escaso |
| Ruta Especial | 6 filas | testimonial |
| Top Truck | 100% | 13 clientes True |
| Dirección → Web (contacto) | 0% | todos vacíos en este export |

## Conclusión sobre la estructura

Tu criterio es correcto en casi todo. Ajustes que propongo frente a tu tabla:

- **Tipo de cliente**: solo `cod_tipo_cliente` (A/B/C/D), como dices. El literal es redundante.
- **Clasificac. abc**: fuera, está vacío.
- **Extensión**: fuera de la tabla principal (8% y sin lectura comercial), pero se conserva (ver más abajo).
- **Estado**: fuera como filtro; genera confusión con "cliente activo", que ya se calcula por última venta.
- **Prohibic. venta**: la subiría de "QUIZÁS" a **SÍ** — es la única bandera con volumen real y avisa al comercial antes de visitar.
- **Nº empleados taller** y **Observaciones almacén**: los mantengo porque los marcas SÍ/DUDA, pero hoy están casi vacíos.
- **Contacto (dirección…web)**: columnas creadas y vacías, listas para cuando el export las traiga. Sin coste.

**Y para tus dudas: nada se pierde.** Todo campo que no pase a columna propia se guarda en una columna `extra` (JSON) del cliente. Si mañana quieres explotar Extensión, Serie o Modo de pago, están ahí y se promocionan a columna sin recargar nada.

## Estructura final de `clientes`

Columnas de trabajo: `cod_cliente`, `razon_social`, `cif`, `ruta_comercial`, `cod_delegacion`, `delegacion`, `cod_vendedor`, `vendedor`, `cod_tipo_cliente`, `num_empleados_taller`, `observaciones_almacen`, `fecha_alta`, `prohibicion_venta` (+`cod_prohibicion_venta`), `cod_rappel`, `grupo_rappel`, `tramos_rappel`, `grupo`, `ruta_especial`, `top_truck` (booleano), contacto (`direccion`, `cod_postal`, `localidad`, `provincia`, `telefono`, `telefono2`, `email`, `persona_contacto`, `web`) y `extra` (JSON con el resto).

`productos` (Dim_Referencia): referencia, descripción, familia + nombre, marca + nombre, proveedor + código, estado, sustituye_a, sustituida_por, observaciones, primera_venta, última_venta, unidades_periodo, importe_periodo.

`ventas_diarias` (Hechos_Diarios): sin cambios — cliente, referencia, marca, familia, fecha, unidades, importe, margen.

## Plan de ejecución

1. **Vaciar datos**: ventas_diarias, resúmenes, cliente_kpis, cliente_productos, clientes, productos, rutas, ventas_mensuales, detalle_ventas, compras, visitas, visitas_planificadas, cliente_insights, sync_log. Se conservan usuarios, perfiles, roles, dashboards y permisos, app_settings y motivos de visita.
2. **Migración de estructura**: nuevas columnas en `clientes` y `productos`, eliminación de las obsoletas del maestro antiguo (incluido el `observaciones` que te generaba dudas), y RPC de carga actualizadas.
3. **Carga manual**: en Administración → Gestión de datos, "Ventas" se sustituye por **Maestro ISI (CRM)**: un único Excel con las tres hojas, resumen previo antes de confirmar, carga por lotes con progreso y recálculo automático de resúmenes y KPIs al terminar. "Compras" se mantiene.
4. **Formato de miles**: helper único es-ES (punto para miles, coma para decimales) aplicado también donde aún se usa el formato por defecto del navegador (tooltips de gráficos y contadores).

## Detalles técnicos

- `TRUNCATE` en orden de dependencias; sin tocar `auth`, `profiles`, `user_roles`, `dashboards`, `user_dashboard_access`, `app_settings`, `motivos_visita`, `motivo_campos`.
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` + `DROP COLUMN` de las obsoletas; `extra jsonb NOT NULL DEFAULT '{}'`. `upsert_clientes_maestro` / `upsert_productos_maestro` reescritas (SECURITY DEFINER, admin-only) con `ON CONFLICT` por clave natural.
- Nuevo `src/lib/datasets/maestroIsi.ts` en sustitución de `ventas.ts`; parseo con `@e965/xlsx`, lotes de ~2.000 filas a `insertar_ventas_diarias` (`_reset` en el primero) y `refrescar_resumenes_admin` al final.
- Nuevo `src/lib/format.ts` (`eur`, `num`, `pct`) reutilizado desde `useCrm.ts`, páginas y componentes de gráfico.
