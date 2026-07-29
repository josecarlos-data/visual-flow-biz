## Qué está pasando

La carga del Maestro ISI falla en el primer paso ("Limpieza inicial") con `cannot truncate a table referenced in a foreign key constraint`.

Verificado en la base de datos: la función `reset_maestro_isi_data` hace `TRUNCATE` tabla por tabla, y hay dos claves foráneas que lo impiden:

- `ventas_mensuales.cod_cliente` → `clientes`
- `visitas_planificadas.visita_id` → `visitas`

Postgres rechaza truncar una tabla referenciada aunque la tabla que la referencia ya esté vacía, salvo que se trunquen juntas en la misma sentencia o con `CASCADE`.

## Riesgo detectado (importante)

La función actual también borra `visitas` y `visitas_planificadas`. Como el histórico de Gespromo ya se ha importado correctamente, cada carga del Maestro ISI lo estaría eliminando. Hay que sacar las visitas del reset.

## Cambios

1. **Migración**: reescribir `reset_maestro_isi_data` para
   - truncar en una sola sentencia todas las tablas de datos comerciales (clientes, productos, ventas_diarias, detalle_ventas, ventas_mensuales, cliente_productos, cliente_kpis, resúmenes, cliente_insights),
   - **no** tocar `visitas` ni `visitas_planificadas`.

2. **Carga de datos**: subir yo el Maestro ISI directamente a la base de datos usando los RPC existentes (`upsert_clientes_maestro`, `upsert_productos_maestro`, `insertar_ventas_diarias`) y refrescar los resúmenes con `refrescar_resumenes_admin`.

   Para esto necesito que vuelvas a adjuntar el archivo `Maestro ISI - CRM.xlsx` en el chat (el pantallazo no incluye el fichero).

3. **Verificación**: comprobar recuentos por tabla (clientes, productos, ventas_diarias) y que el histórico de visitas sigue intacto.

No hace falta cambiar nada en la pantalla de Gestión de Datos: con la función corregida, la carga manual funcionará igual.
