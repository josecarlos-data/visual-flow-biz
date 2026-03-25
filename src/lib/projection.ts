/**
 * Seasonal projection for the current year based on previous year's monthly distribution.
 *
 * Method:
 * 1. Get monthly weights from the previous year (each month's share of the annual total).
 * 2. Identify months with real data in the current year (value > 0).
 * 3. Detect the current partial month (biweekly billing: 1st half loads on 16-18th,
 *    2nd half loads on 1-3rd of next month). If a month only has one half,
 *    double its value for scale-factor estimation.
 * 4. For months without data: projected_month = scaleFactor * weight_of_target_month.
 * 5. If no previous year data, use uniform weights (1/12) with slight H2 growth bias.
 */

export interface MonthlyValue {
  mes: number;
  valor: number;
}

export interface ProjectionResult {
  mes: number;
  valor: number;       // real value if available, projected otherwise
  isProjected: boolean;
  isPartial?: boolean;  // true if month has only one biweekly period loaded
}

/**
 * Detect which month (if any) is partial based on current date and biweekly billing.
 * - Day 1-3:  previous month may still be missing its 2nd half → prev month is partial
 * - Day 4-15: current month has no data yet (1st half not loaded) → no partial month with data
 * - Day 16-31: current month has only the 1st half → current month is partial
 */
function detectPartialMonth(now: Date): number | null {
  const day = now.getDate();
  const month = now.getMonth() + 1; // 1-12

  if (day >= 16) {
    // 1st half of current month is loaded, 2nd half is not yet
    return month;
  }
  if (day <= 3) {
    // 2nd half of previous month may not be loaded yet
    return month === 1 ? 12 : month - 1;
  }
  // Day 4-15: all closed months are complete, current month has nothing yet
  return null;
}

export function calcularProyeccion(
  ventasActual: MonthlyValue[],
  ventasPrevio: MonthlyValue[],
  currentDate?: Date
): ProjectionResult[] {
  const now = currentDate || new Date();
  const partialMonth = detectPartialMonth(now);

  // Build map of real values for current year (months 1-12)
  const realMap = new Map<number, number>();
  for (const v of ventasActual) {
    realMap.set(v.mes, (realMap.get(v.mes) || 0) + v.valor);
  }

  // Build previous year weights
  const prevMap = new Map<number, number>();
  let prevTotal = 0;
  for (const v of ventasPrevio) {
    prevMap.set(v.mes, (prevMap.get(v.mes) || 0) + v.valor);
    prevTotal += v.valor;
  }

  // Determine weights per month
  const weights = new Map<number, number>();
  if (prevTotal > 0 && prevMap.size >= 6) {
    for (let m = 1; m <= 12; m++) {
      weights.set(m, (prevMap.get(m) || 0) / prevTotal);
    }
  } else {
    const base = 1 / 12;
    for (let m = 1; m <= 12; m++) {
      const bias = m > 6 ? 1 + 0.005 * (m - 6) : 1;
      weights.set(m, base * bias);
    }
    const totalW = Array.from(weights.values()).reduce((a, b) => a + b, 0);
    for (let m = 1; m <= 12; m++) {
      weights.set(m, (weights.get(m) || 0) / totalW);
    }
  }

  // Identify months with real data
  const realMonths = Array.from(realMap.entries()).filter(([, v]) => v > 0);
  if (realMonths.length === 0) {
    return Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, valor: 0, isProjected: true }));
  }

  // Calculate totalReal and sumWeightsReal, adjusting for partial month
  let totalReal = 0;
  let sumWeightsReal = 0;

  for (const [m, v] of realMonths) {
    const w = weights.get(m) || 0;
    if (m === partialMonth) {
      // Partial month: double the value to estimate full month, keep full weight
      totalReal += v * 2;
      sumWeightsReal += w;
    } else {
      totalReal += v;
      sumWeightsReal += w;
    }
  }

  const scaleFactor = sumWeightsReal > 0 ? totalReal / sumWeightsReal : 0;

  const result: ProjectionResult[] = [];
  for (let m = 1; m <= 12; m++) {
    const real = realMap.get(m);
    if (real !== undefined && real > 0) {
      result.push({
        mes: m,
        valor: real,
        isProjected: false,
        isPartial: m === partialMonth,
      });
    } else {
      const projected = scaleFactor * (weights.get(m) || 0);
      result.push({ mes: m, valor: projected, isProjected: true });
    }
  }

  return result;
}
