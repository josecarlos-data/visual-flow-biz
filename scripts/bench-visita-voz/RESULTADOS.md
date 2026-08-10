# Resultados del banco de pruebas — 2026-08-10

Modelo: `openai/gpt-5.6-luna`. Narraciones: `narraciones.json` (observaciones reales del histórico).

| Narración | Versión | Motivos | Bloques competencia | Bloques seguimiento | Campos rellenos | Fuera de enum | Latencia | Tokens | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Icer / plan de choque | fase4.3 | promocion, revision_seguimiento, informacion_potencial | 0 | 0 | 18 | 0 | 5.4 s | 12540 | OK |
| GSMart + viaje | fase4.3 | gsmart, viaje_incentivo | 0 | 0 | 10 | 1 | 4.0 s | 12148 | selects fuera de enum: gsmart.tema="Formación" |
| Potencial + competencia (3 baterías) | fase4.3 | competencia, informacion_potencial | 3 | 0 | 25 | 0 | 6.6 s | 12920 | OK |

Resultado esperado de cada narración, en `narraciones.json` (`esperado`).
