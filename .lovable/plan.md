# FASE 4.3 — Dos ajustes al prompt (mismo modelo: luna)

Solo se toca `supabase/functions/visita-voz/index.ts` (prompt + versión) y se repite
la comparativa. Sin cambios de modelo, de esquema ni de base de datos.

## 1. Un bloque por comparativa de precio

En `sistemaExtraccion`, dentro de la regla imperativa de competencia, se añade:

> Cada referencia comparada es una comparativa independiente: si el comercial compara
> dos o más referencias con precios distintos, devuelves un bloque `competencia` por
> cada una, nunca uno resumido. `resultado_venta` se rellena en cada bloque.

Ejemplo nuevo con dos referencias, del estilo de la narración real de baterías:

> «la batería de 110 se la dan a 78 y nosotros a 92, y la de 140 a 105 frente a
> nuestros 121» => dos bloques `competencia`, uno con precio_competencia=78 /
> precio_rimosa=92 y otro con 105 / 121, cada uno con su referencia y su
> `resultado_venta`.

Se refuerza también en la `description` del array `bloques_competencia`
(en `esquemaExtraccion`): "una comparativa por referencia y precio; no las agrupes".

## 2. `seguimiento` sobrante

La regla actual («cajón de último recurso») se endurece:

> `seguimiento` solo se instancia si NO has creado ningún otro bloque. Si ya existe al
> menos un bloque de otro motivo, no añadas `seguimiento` salvo que quede contenido
> concreto que no encaje en ninguno de ellos; en ese caso el bloque recoge únicamente
> ese contenido sobrante, nunca un resumen de lo ya repartido.

## 3. Versión e historial

`VERSION_PROMPT` pasa a `"fase4.3"` y se añade al bloque HISTORIAL del archivo la
entrada correspondiente con los dos cambios y la fecha (09/08/2026).

## 4. Comparativa fase4.2 vs fase4.3 (solo luna)

Se reutiliza el banco de pruebas de la comparativa anterior con las mismas tres
narraciones reales del histórico (`559968f1` Icer, `8608eef9` GSMart+viaje,
`a8a76aa5` potencial+competencia), con `temperature: 0`, y se entrega tabla con:

- motivos acertados por narración,
- número de bloques `competencia` (se espera 1 → 3 en la narración de baterías),
- bloques `seguimiento` sobrantes (se espera que desaparezcan),
- campos correctos y selects fuera de enum,
- latencia y coste.

Conclusión explícita: si fase4.3 rompe algo que fase4.2 acertaba, se dice y se
revierte a fase4.2.

No se avanza a ninguna otra fase.
