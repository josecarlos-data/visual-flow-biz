# Banco de pruebas del prompt de `visita-voz`

Cada vez que se toca el prompt (`supabase/functions/_shared/visita-voz-prompt.ts`) hay
que reejecutar esto y actualizar este fichero:

```bash
bun scripts/bench-visita-voz/bench.ts               # versión anterior vs actual
bun scripts/bench-visita-voz/bench.ts --solo-actual
```

Requiere `LOVABLE_API_KEY` y `SUPABASE_DB_URL` en el entorno. Las tres narraciones y su
resultado esperado están en `narraciones.json`; son observaciones reales del histórico
de Gespromo. El snapshot del prompt anterior se congela en `prompt-fase4.2.ts` (nunca se
edita: cuando haya una fase4.4 se añade otro snapshot). La ejecución cruda se vuelca en
`RESULTADOS-ultima-ejecucion.md`; este fichero es el histórico curado.

## fase4.2 vs fase4.3 — 10/08/2026, modelo `openai/gpt-5.6-luna`

| Narración | Versión | Motivos | Bloques competencia | Bloques seguimiento | Campos rellenos | Fuera de enum | Latencia | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Icer / plan de choque | fase4.2 | seguimiento, promocion, revision_seguimiento, informacion_potencial | 0 | 1 | 17 | 0 | 5,6 s | seguimiento sobrante |
| Icer / plan de choque | fase4.3 | promocion, revision_seguimiento, informacion_potencial | 0 | 0 | 11–18 | 0 | 4,0–6,0 s | OK |
| GSMart + viaje | fase4.2 | seguimiento, gsmart, viaje_incentivo | 0 | 1 | 17 | 1 | 5,5 s | seguimiento sobrante + enum |
| GSMart + viaje | fase4.3 | gsmart, viaje_incentivo | 0 | 0 | 10–11 | 0–1 | 4,0–4,6 s | OK |
| Potencial + competencia (3 baterías) | fase4.2 | competencia, informacion_potencial | 1 | 0 | 12 | 0 | 4,5 s | 1 bloque, esperados 3 |
| Potencial + competencia (3 baterías) | fase4.3 | competencia, informacion_potencial | 3 | 0 | 22–25 | 0 | 6,4–6,6 s | OK |

Tres ejecuciones de fase4.3. Conclusión: los dos ajustes hacen lo que pretendían —las
tres baterías salen en tres bloques `competencia` con sus precios, y desaparece el
`seguimiento` sobrante de las dos primeras narraciones— sin perder ningún motivo que
fase4.2 acertara. La latencia sigue muy por debajo de los 10 s y el coste no se mueve
(~12.000–12.900 tokens por narración).

Variabilidad entre ejecuciones, no achacable a la versión:
- `gsmart.tema="Formación"` sale a veces fuera del enum; el servidor lo descarta.
- Un `informacion_potencial` marginal aparece o no en las dos primeras narraciones.
