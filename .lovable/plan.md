# Ficha de cliente enriquecida — contenedor de hechos de perfil

Modo Plan. No se ejecuta nada todavía. Cuando se apruebe: solo migración SQL, sin tocar componentes, páginas ni edge functions.

## Contraste con el esquema real

Verificado contra la base de datos actual:

- `clientes.cod_cliente` tiene restricción UNIQUE propia, así que la FK desde `cliente_perfil_datos` es válida.
- `visitas.id` y `visita_bloques.id` son claves primarias uuid: las dos FK propuestas funcionan.
- `public.can_view_cliente(uuid, integer)`, `public.is_admin(uuid)` y `public.update_updated_at_column()` existen con esas firmas exactas, y las dos primeras tienen permiso de ejecución para usuarios autenticados (necesario porque se evalúan dentro de las políticas). Nombres correctos, nada que renombrar.
- `motivo_campos` no tiene todavía ninguna columna de enlace a perfil: la columna nueva no choca con nada.
- El motivo `informacion_potencial` tiene 17 campos activos; excluyendo `persona_contacto` y `observaciones` el seed crea 15 atributos.

Puntos a corregir o tener en cuenta (todos menores; el modelo de hechos se mantiene tal cual):

1. **La vista debe declararse con `security_invoker = true`.** Las cinco vistas del proyecto (`v_visita_bloques_campos`, `v_ficha_flota_actual`, etc.) lo llevan. Sin eso la vista se evalúa con permisos del propietario y salta el aislamiento por comercial: cualquier usuario vería el perfil de todos los clientes.
2. **Nombre de la vista.** La convención del proyecto es prefijo `v_`. Se creará como `public.v_cliente_perfil_vigente`.
3. **Índices.** El índice compuesto `(cod_cliente, atributo_key, observado_en DESC, created_at DESC)` es exactamente el que necesita el `DISTINCT ON` de la vista, pero conviene hacerlo **parcial** con `WHERE estado <> 'descartado'`, que es el mismo filtro de la vista. Con eso, el índice suelto `(atributo_key) WHERE estado <> 'descartado'` sobra para la consulta de valor vigente; se mantiene solo si se quiere listar "todos los clientes con un atributo dado" (informes tipo "quién tiene máquina de diagnosis"), que sí es un caso previsto. Se deja, pero como índice parcial de apoyo a informes, no a la ficha. `(visita_id)` es útil para el borrado en cascada y para el enlace inverso desde la visita: se mantiene.
4. **`GRANT` explícitos.** Ambas tablas y la vista necesitan GRANT para `authenticated` (y `service_role`); sin ellos la API devuelve error de permisos aunque las políticas sean correctas. Nada para `anon`.
5. **`opciones` heredadas del seed.** En `motivo_campos` ese campo unas veces es una lista literal y otras una referencia a catálogo (`{"catalogo": "..."}`); 4 de los 15 atributos son referencias. Se copia tal cual, que es lo correcto: el resolutor de opciones ya entiende los dos formatos.
6. **Conflicto potencial con el importador CSV (fase siguiente, no ahora).** El importador reescribe bloques existentes de origen externo con UPDATE sobre el mismo `visita_bloques.id`. Con `UNIQUE (bloque_id, atributo_key)`, la promoción del dato tendrá que ser un upsert sobre esa clave, no un insert; si no, una reimportación fallará por duplicado. Queda anotado para cuando se implemente la escritura.
7. **Borrado de bloques.** `bloque_id ... ON DELETE CASCADE` implica que borrar un bloque de visita borra sus hechos derivados. Es coherente con el modelo (el hecho lo observa ese bloque), pero conviene saberlo: el histórico de ese dato desaparece con él.
8. **`v_ficha_flota_actual` queda como está.** Hoy deriva el perfil vigente directamente de `visita_bloques`. No se toca en esta fase; convivirá con la tabla nueva hasta que la escritura de hechos esté en marcha.

Nada más del esquema propuesto entra en conflicto: no hay tabla, columna, función ni política con esos nombres.

## Migración a aplicar

1. `public.perfil_atributos` con los campos indicados (`key` como PK textual).
2. `public.cliente_perfil_datos` con las FK, los CHECK de `fuente` y `estado`, y `UNIQUE (bloque_id, atributo_key)`.
3. Índices: compuesto parcial para el valor vigente, `(visita_id)`, y parcial por `atributo_key` para informes.
4. `motivo_campos.perfil_atributo_key text REFERENCES perfil_atributos(key) ON DELETE SET NULL`.
5. Vista `public.v_cliente_perfil_vigente` con `security_invoker = true`.
6. Triggers `update_updated_at_column()` en ambas tablas.
7. GRANT + RLS:
   - `perfil_atributos`: lectura para autenticados; alta, cambio y borrado solo administradores.
   - `cliente_perfil_datos`: ver, crear y modificar solo si el usuario tiene visibilidad sobre ese cliente; borrar solo administradores.
8. Seed de los 15 atributos desde `informacion_potencial` y relleno de `perfil_atributo_key`.

No se inserta ningún dato en `cliente_perfil_datos`.
