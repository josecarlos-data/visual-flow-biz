# Banco de pruebas del prompt de `visita-voz`

Cada vez que se toca el prompt (`supabase/functions/visita-voz/prompt.ts`) hay que
reejecutar esto y actualizar este fichero:

```bash
bun scripts/bench-visita-voz/bench.ts               # versión anterior vs actual
bun scripts/bench-visita-voz/bench.ts --solo-actual
```

Requiere `LOVABLE_API_KEY` y `SUPABASE_DB_URL` en el entorno. Las tres narraciones y
su resultado esperado están en `narraciones.json`; son observaciones reales del
histórico de Gespromo. El snapshot del prompt anterior se congela en
`prompt-fase4.2.ts` (nunca se edita: se añade otro snapshot).

## fase4.2 vs fase4.3 — 10/08/2026, modelo `openai/gpt-5.6-luna`

| Narración | Versión | Motivos | Bloques competencia | Bloques seguimiento | Campos rellenos | Fuera de enum | Latencia | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Icer / plan de choque | fase4.2 | seguimiento, promocion, revision_seguimiento, informacion_potencial | 0 | 1 | 17 | 0 | 5,6 s | seguimiento sobrante |
| Icer / plan de choque | fase4.3 | promocion, revision_seguimiento, informacion_potencial | 0 | 0 | 11 | 0 | 4,0–6,0 s | OK |
| GSMart + viaje | fase4.2 | seguimiento, gsmart, viaje_incentivo | 0 | 1 | 17 | 1 | 5,5 s | seguimiento sobrante + enum |
| GSMart + viaje | fase4.3 | gsmart, viaje_incentivo | 0 | 0 | 10–11 | 0–1 | 4,0–4,6 s | OK |
| Potencial + competencia (3 baterías) | fase4.2 | competencia, informacion_potencial | 1 | 0 | 12 | 0 | 4,5 s | 1 bloque, esperados 3 |
| Potencial + competencia (3 baterías) | fase4.3 | competencia, informacion_potencial | 3 | 0 | 22–25 | 0 | 6,4–6,6 s | OK |

Conclusión: los dos ajustes de fase4.3 hacen lo que pretendían (tres comparativas de
batería en tres bloques, y desaparece el `seguimiento` sobrante de las dos primeras
narraciones) sin perder ningún motivo que fase4.2 acertara.

Variabilidad observada entre ejecuciones, no achacable a la versión:
- `gsmart.tema="Formación"` sale a veces fuera del enum; el servidor lo descarta.
- El bloque `promocion` del Icer y un `informacion_potencial` marginal aparecen o no
  según la ejecución. Dos ejecuciones de fase4.3 dan 2/3 y 3/3 casos OK.
