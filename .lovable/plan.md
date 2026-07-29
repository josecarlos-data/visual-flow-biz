**Diagnóstico**

- La carga no está fallando por el archivo completo, sino por la parte de **productos/referencias**.
- El Excel contiene referencias repetidas dentro del mismo bloque de carga.
- La base de datos intenta actualizar la misma referencia más de una vez en una sola operación y por eso devuelve: `ON CONFLICT DO UPDATE command cannot affect row a second time`.
- Además, el refresco de resúmenes ha llegado a timeout, así que ahora la base está en estado **parcial/incompleto**.

**No hacer ahora**

- No volver a cargar todavía.
- Si recargas sin corregirlo, volverá a fallar y puede dejar datos parciales otra vez.

**Plan de corrección**

1. **Deduplicar productos en la base**
   - Modificar `upsert_productos_maestro` para que agrupe por `referencia` antes de insertar/actualizar.
   - Si una referencia aparece varias veces, conservar una única versión combinando los campos disponibles.

2. **Deduplicar clientes también**
   - Modificar `upsert_clientes_maestro` para agrupar por `cod_cliente`.
   - Esto evita el mismo problema si en futuras exportaciones vienen clientes duplicados.

3. **Limpiar la carga parcial actual**
   - Vaciar únicamente las tablas de datos comerciales/cargados:
     - clientes
     - productos
     - ventas diarias
     - resúmenes de cliente, familia, marca y mes
     - KPIs de cliente
     - visitas/agenda si están vinculadas al maestro cargado
   - Mantener usuarios, roles, permisos de dashboards y parámetros de administración.

4. **Hacer la carga completa reiniciable**
   - Al iniciar una nueva carga del Maestro ISI, limpiar primero los datos comerciales derivados.
   - Después cargar clientes, productos y ventas.
   - Finalmente regenerar resúmenes y KPIs.

5. **Reducir riesgo de timeout en resúmenes**
   - Revisar índices y añadir los necesarios para que el refresco de resúmenes sobre ventas diarias sea más rápido.
   - Mantener la lógica de seguridad por comercial/delegación.

6. **Mejorar feedback en pantalla**
   - Si falla una parte de la carga, mostrar qué bloque falló: clientes, productos, ventas o resúmenes.
   - Evitar que parezca que se han cargado bien cientos de miles de registros cuando la carga quedó incompleta.

**Resultado esperado**

- Podrás volver a subir el Excel una sola vez.
- Las referencias repetidas no romperán la carga.
- La base quedará limpia y consistente.
- Los paneles se calcularán sobre datos completos, no parciales.