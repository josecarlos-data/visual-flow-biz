# Catálogo de competidores reales + revisión del resto de catálogos

## Lo que he comprobado en el histórico

Contraste de cada valor contra las 18.017 observaciones (y sus originales):

- Genéricos actuales: **AD Parts 0, Recalvi 0, Sernauto 0**, "Grupo Serca" 8 y "Grupo Andel" 8
  (y esos pocos son coincidencias parciales, no la empresa), "Alcázar" 3. Confirmado: la lista de la
  FASE 3 no sirve.
- Tus competidores sí aparecen, y en el orden que dices: **Luis Moleón 607, Grupo Peña 445,
  Eurorecambios 251** (incluye "Salysan"), Pedreño 93, Bahía 82, Aliauto 68, JJ 58, Trapaco 50,
  Resumpe 43, Moral 43, Relusur 42, Fuenpar 38, Würth 37, Recamer 35, Del Olmo 29, Sabán 28,
  Hnos. Martínez 15, Berner 15, Resurmop 12, Scora 10, Medialdea 9, CBM 8, Cotocar 8, Emex 7,
  San Cristóbal 7, Lomeña 5, Blinker 5, Davasa 3, Varisa 1, Maquidiesel 1.

## Cambio 1 — Sustituir el catálogo `competidores`

- `is_active = false` en los 7 genéricos (AD Parts, Grupo Serca, Recalvi, Grupo Andel,
  Auto Recambios Alcázar, Sernauto, Distribuidor local). **No se borra ninguno**: si algún bloque ya
  los tuviera guardados, el valor sigue siendo legible.
- Se insertan los 30 reales activos, con `orden` según la frecuencia medida arriba, de modo que en el
  desplegable el comercial encuentre primero Luis Moleón, Grupo Peña y Eurorecambios.
- "Otro (detállalo en la conclusión)" ya existe: se conserva y se manda al final del orden.

## Cambio 2 — Alias en la ayuda de `competencia.competidor`

La ayuda pasa a incluir la tabla de equivalencias, que es lo que la IA lee como descripción del campo:

> Elige de la lista; la misma empresa debe registrarse siempre igual. Alias habituales:
> LM / L.M. / LMR / Luis / Moleón = **Luis Moleón**; Peña / G. Peña = **Grupo Peña**;
> Euro / Salysan = **Eurorecambios**. Si el competidor no está en la lista, elige
> "Otro (detállalo en la conclusión)" y escribe el nombre en la conclusión.

Con esto la extracción de voz y el futuro reproceso del histórico reconocen "me lo hace LM a 40 €"
sin cambiar el prompt.

## Cambio 3 — Revisión de los demás catálogos

- **`temas_gsmart`** — correcto, no se toca. GSMart aparece 1.048 veces y los seis puntos son el guion
  literal que el director exige ("HAY UN GUION, HAY QUE CEÑIRSE A ESE GUIÓN"). Un ajuste menor: el
  banco de pruebas detectó que el modelo devuelve "Formación" fuera de enum, así que se añade ese
  sinónimo a la ayuda apuntando a "Formación / repaso del guion".
- **`tipo_ejes`** — real: SAF 669, BPW 132, ROR 33. Pero **Fruehauf sale 1 vez y Guitart 0**: los dejo
  activos salvo que me digas lo contrario, porque son marcas de eje que existen y el coste de tenerlas
  es nulo; si prefieres una lista limpia, los desactivo.
- **`partners`** — no son nombres inventados sino categorías de acompañante (proveedor, marca, taller,
  otro). No tiene sentido contrastarlo contra el texto: se queda igual.
- **`marcas_vehiculo`** y **`canales_envio`** — también son categorías cerradas correctas, sin cambios.

## Detalle técnico

Una sola operación de datos sobre `catalogos_opciones` (desactivar + insertar con `ON CONFLICT` por
clave/valor para que sea reejecutable) y una actualización de `ayuda` en `motivo_campos` para
`competencia.competidor` y `gsmart.tema`. Sin cambios de esquema y sin tocar `visita_bloques`.
La caché de catálogo de la función de voz es de 5 minutos, así que el cambio entra solo.

## Verificación

- Listado del catálogo activo tras el cambio, en orden.
- Comprobación de que ningún bloque existente queda con un `competidor` que ya no exista en la tabla.
- Una tirada del banco de pruebas con una narración que mencione "LM" para confirmar que ahora mapea a
  Luis Moleón en vez de quedarse vacío.
