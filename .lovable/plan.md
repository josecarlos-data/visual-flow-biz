# FASE 6b — Vistas analíticas sobre los bloques de visita

Solo la 6b. Dos entregables: las vistas SQL y el registro en el repo de la comparativa
`sol` vs `luna`.

## Estado verificado antes de planificar

- En `public` no existe **ninguna** vista hoy (`information_schema.views` vacío).
- Claves reales en `motivo_campos` (reseed FASE 3), distintas de las del plan original:
  - `competencia`: `competidor`, `marca_competencia`, `referencia_competencia`,
    `precio_rimosa`, **`precio_competencia`** (no `precio_competidor`), `resultado_venta`,
    `conclusion`, `foto_albaran`. El viejo `referencia` está `is_active=false`.
  - `promocion`: `referencia`, `producto`, `cantidad`, `precio_ofertado`, `canal_envio`,
    `respuesta_cliente`, `importe_estimado`, `proxima_accion`, `fuera_de_plazo`,
    `motivo_fuera_plazo` (`campana_id` inactivo, es de la FASE 5).
  - `informacion_potencial`: `persona_contacto`, `num_vehiculos`, `marcas_vehiculo`,
    `tipo_ejes`, `num_mecanicos`, `tipo_trabajo`, `referencias_consumo`,
    `potencial_estimado`, `observaciones`. **No existe `fecha_verificacion`**, que es lo
    que el plan original usaba para ordenar la ficha de flota.
- `nota_revision` ya se muestra en la ficha del cliente y en revisión: ese punto del plan
  original ya está cubierto por la 6a y no se rehace.
- `reprocesar_historico_a_bloques()` ya existe creada y sin ejecutar: se deja igual.

## Vistas a crear

Todas con `security_invoker = true` (respetan la RLS de `visitas`/`visita_bloques`, sin
puerta trasera) y `GRANT SELECT ... TO authenticated` únicamente, en línea con el
endurecimiento ya aplicado (nada para `anon`).

1. `v_visita_bloques_campos` (base, formato largo)
   Un registro por bloque y campo: `visita_id, bloque_id, cod_cliente, fecha, vendedor,
   ruta, delegación, motivo_key, campo_key, valor_texto, valor_num, confianza, cita,
   validacion`. Es la capa sobre la que se apoyan las demás y evita repetir el
   desanidado del jsonb en cada vista.

2. `v_visita_oferta` (bloques `promocion`)
   Cabecera de visita + `referencia`, `producto`, `cantidad`, `precio_ofertado`,
   `canal_envio`, `respuesta_cliente`, `importe_estimado`, `proxima_accion`,
   `fuera_de_plazo`, `motivo_fuera_plazo`, con los numéricos ya casteados.

3. `v_visita_competencia` (bloques `competencia`)
   Cabecera + `competidor`, `marca_competencia`, `referencia_competencia`,
   `precio_rimosa`, `precio_competencia`, `resultado_venta`, `conclusion`, y calculados:
   - `gap_eur = precio_rimosa - precio_competencia`
   - `gap_pct = (precio_rimosa - precio_competencia) / NULLIF(precio_competencia,0) * 100`
   Ambos nulos si falta alguno de los dos precios.

4. `v_ficha_flota_actual` (bloques `informacion_potencial`)
   Un registro por cliente con el **último valor no nulo de cada campo**, no la última
   fila entera: al no existir `fecha_verificacion` se ordena por `visitas.fecha` y, a
   igualdad, por `created_at` del bloque. Se hace campo a campo para que una visita
   reciente que solo aporta el nº de mecánicos no borre las marcas de vehículo
   registradas antes. Incluye `fecha_ultima_actualizacion` y `visita_id_origen`.

## Mejoras que propongo incorporar (nuevas respecto al plan original)

- **Casteo numérico tolerante**: los valores llegan como texto del formulario y de la IA
  (comas decimales, "€", espacios). Una función `to_num_visita(text)` inmutable
  normaliza antes de castear, para que `gap_eur` no se caiga con "194,70 €".
- **Columna `validacion` en todas las vistas** en lugar de filtrar: quien analice decide
  si excluye lo marcado `NO CORRECTO`. Sin ella se perdería el 100 % del histórico no
  revisado.
- **`v_visita_accion_pendiente`**: `proxima_accion` existe en 7 de los 11 motivos y hoy
  no hay forma de listarlo. Vista transversal con cliente, motivo, texto de la acción y
  `fecha_proxima_accion` cuando el motivo la tiene. Es el uso más inmediato para el
  comercial y sale casi gratis desde la vista base.
- Índice GIN sobre `visita_bloques.campos` y btree en `(motivo_key)` si el plan de
  ejecución lo pide; se mide antes de crearlo.

Si prefieres dejar fuera `v_visita_accion_pendiente` o la vista base y quedarte solo con
las tres del plan original, dilo y lo recorto.

## Verificación

- Recuento por vista y contraste contra los bloques de ese motivo (mismo nº de filas).
- Un cliente con las tres baterías del caso de prueba: debe salir con 3 filas en
  `v_visita_competencia` y sus `gap_eur` correctos.
- Comprobación de RLS: consulta como comercial y como admin devuelven volúmenes
  distintos y coherentes con `clientes_permitidos`.

## Entregable 2 — Comparativa `sol` vs `luna` en RESULTADOS.md

Se añade a `scripts/bench-visita-voz/RESULTADOS.md`, antes de la tabla de
fase4.2 vs fase4.3, la sección **"Elección de modelo — sol vs luna (prompt fase4.2)"**
con los datos de aquella ejecución: motivos acertados (luna 7/7, sol 6/7 más un bloque
inventado), campos correctos, selects fuera de enum, latencia (luna 3,3–5,7 s; sol
7,6–13,3 s) y coste (~26× a favor de luna), y la conclusión escrita de por qué se fija
luna. Queda marcado como transcripción de la ejecución del 09/08/2026, no como una
tirada nueva; si prefieres reejecutarla ahora con el harness actual para que los números
salgan del mismo script, lo hago y se anota como ejecución nueva.

No se avanza a ninguna otra fase.
