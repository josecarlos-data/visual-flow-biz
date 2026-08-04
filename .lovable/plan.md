# Corrección FASE 6a — reparto de `nota_revision`

## Diagnóstico

La función `repartir_observaciones_gespromo()` sólo intenta detectar el marcador cuando
la **primera línea entera** está en mayúsculas (`raw1 = upper(raw1)`). En los casos reales
que aportas, la observación del comercial va pegada en la misma línea:

```text
NO CORRECTO REFERENCIA INEXISTENTE NO SE PUEDE CONTRASTAR Aforador ref: ...
```

Esa línea contiene minúsculas, así que la condición falla, no se extrae ni marcador ni
comentario, y `nota_revision` queda NULL. En el caso multilínea (`NO CORRETO\nNO HAY MARCA...`)
sí se detecta el marcador, pero el resto de la línea del marcador está vacío y el bucle de
líneas siguientes exige mayúsculas exactas (`l1 = upper(l1)`), regla demasiado estricta con
acentos y signos.

## Qué se va a cambiar

Reescribir `public.repartir_observaciones_gespromo(boolean)` con un reparto por **palabras**,
no por líneas completas:

1. Detección del marcador (`CORRECTO` / `NO CORRECTO`, con tolerancia de erratas tipo
   `NO CORRETO`) sobre los primeros tokens de la primera línea, **sin exigir** que la línea
   completa sea mayúscula.
2. Tras retirar el marcador, se recorren los tokens restantes de esa misma línea mientras
   sean mayúsculas (o puntuación/números/`??`); en cuanto aparece un token con minúsculas,
   ahí empieza la observación del comercial. Ese tramo mayúsculo se suma a la nota del director.
3. Se anexan las líneas siguientes que sean íntegramente del director, hasta la primera
   que no lo sea.
4. Criterio de "línea/tramo del director": al menos el **90 % de sus letras en mayúscula**
   y **8 letras o más**. Se conservan literalmente los signos `??`.
5. El resultado concatenado va a `visita_bloques.nota_revision`; todo lo demás (resto de la
   línea del marcador + líneas posteriores) se guarda en `visitas.observaciones`, sin pérdida
   de texto.
6. El mismo tratamiento se aplica tanto a `NO CORRECTO` como a `CORRECTO`.

La función sigue siendo idempotente: siempre parte de `observaciones_original` y reescribe
`observaciones`, `validacion` y `nota_revision`.

## Ejecución

- Desactivar sólo `trg_visita_bloques_agregado` durante el reparto (los otros dos triggers
  se mantienen), ejecutar `repartir_observaciones_gespromo(true)`, recalcular el agregado de
  `visitas.validacion` y volver a activar el trigger.
- Después, contar y reportar:
  - filas de `visita_bloques` con `nota_revision` no nula (esperado del orden de ~1.650),
  - reparto CORRECTO / NO CORRECTO / pendiente,
  - varios ejemplos reales de original → nota + observación para validar visualmente.

## Detalle técnico

- Migración única `CREATE OR REPLACE FUNCTION public.repartir_observaciones_gespromo(boolean)`
  (SECURITY DEFINER, `search_path = public, extensions`, `REVOKE` a anon/authenticated como ahora).
- Función auxiliar interna (expresión inline) para el test de "mayúsculas del director":
  contar letras vía `regexp_replace(x, '[^[:alpha:]]', '', 'g')` y comparar con su versión
  `upper()`, exigiendo ratio ≥ 0,9 y longitud ≥ 8.
- Sin cambios de frontend: `ClienteDetalle.tsx` y `RevisionVisitas.tsx` ya muestran
  `nota_revision` destacada.

No se avanza a ninguna otra fase.
