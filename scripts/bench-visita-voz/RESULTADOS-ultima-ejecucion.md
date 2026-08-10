# Resultados del banco de pruebas — 2026-08-10

Prompt: `fase4.3`. Modelos: `openai/gpt-5.6-sol`, `openai/gpt-5.6-luna`.
Narraciones: `narraciones.json` (observaciones reales del histórico).

| Narración | Versión / modelo | Motivos | Bloques competencia | Bloques seguimiento | Campos rellenos | Fuera de enum | Latencia | Tokens | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Icer / plan de choque | fase4.3 / openai/gpt-5.6-sol | revision_seguimiento, informacion_potencial | 0 | 0 | 9 | 0 | 9.1 s | 12161 | faltan motivos: promocion |
| Icer / plan de choque | fase4.3 / openai/gpt-5.6-luna | revision_seguimiento, informacion_potencial | 0 | 0 | 10 | 0 | 4.1 s | 12171 | faltan motivos: promocion |
| GSMart + viaje | fase4.3 / openai/gpt-5.6-sol | gsmart, viaje_incentivo, informacion_potencial | 0 | 0 | 15 | 0 | 12.7 s | 12435 | OK |
| GSMart + viaje | fase4.3 / openai/gpt-5.6-luna | gsmart, viaje_incentivo | 0 | 0 | 10 | gsmart.tema="Formación" | 4.2 s | 12148 | selects fuera de enum: gsmart.tema="Formación" |
| Potencial + competencia (3 baterías) | fase4.3 / openai/gpt-5.6-sol | competencia, informacion_potencial | 4 | 0 | 28 | 0 | 17.8 s | 13232 | bloques competencia 4, esperados 3 |
| Potencial + competencia (3 baterías) | fase4.3 / openai/gpt-5.6-luna | competencia, informacion_potencial | 3 | 0 | 22 | 0 | 6.1 s | 12814 | OK |

Resultado esperado de cada narración, en `narraciones.json` (`esperado`).
