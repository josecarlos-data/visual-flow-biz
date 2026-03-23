/**
 * Seasonal projection for the current year based on previous year's monthly distribution.
 *
 * Method:
 * 1. Get monthly weights from the previous year (each month's share of the annual total).
 * 2. Identify months with real data in the current year (value > 0).
 * 3. For months without data: projected_month = (real_total / sum_of_weights_for_real_months) * weight_of_target_month.
 * 4. If no previous year data, use uniform weights (1/12) with a slight H2 growth bias (+0.5%/month cumulative).
 */

export interface MonthlyValue {
  mes: number;
  valor: number;
}

export interface ProjectionResult {
  mes: number;
  valor: number;       // real value if available, projected otherwise
  isProjected: boolean;
}

export function calcularProyeccion(
  ventasActual: MonthlyValue[],
  ventasPrevio: MonthlyValue[]
): ProjectionResult[] {
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
    // Use seasonal profile from previous year
    for (let m = 1; m <= 12; m++) {
      weights.set(m, (prevMap.get(m) || 0) / prevTotal);
    }
  } else {
    // Uniform with slight H2 growth bias
    const base = 1 / 12;
    for (let m = 1; m <= 12; m++) {
      const bias = m > 6 ? 1 + 0.005 * (m - 6) : 1;
      weights.set(m, base * bias);
    }
    // Normalize
    const totalW = Array.from(weights.values()).reduce((a, b) => a + b, 0);
    for (let m = 1; m <= 12; m++) {
      weights.set(m, (weights.get(m) || 0) / totalW);
    }
  }

  // Sum of weights for months with real data
  const realMonths = Array.from(realMap.entries()).filter(([, v]) => v > 0);
  if (realMonths.length === 0) {
    // No data at all — return zeros
    return Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, valor: 0, isProjected: true }));
  }

  const sumWeightsReal = realMonths.reduce((acc, [m]) => acc + (weights.get(m) || 0), 0);
  const totalReal = realMonths.reduce((acc, [, v]) => acc + v, 0);

  const scaleFactor = sumWeightsReal > 0 ? totalReal / sumWeightsReal : 0;

  const result: ProjectionResult[] = [];
  for (let m = 1; m <= 12; m++) {
    const real = realMap.get(m);
    if (real !== undefined && real > 0) {
      result.push({ mes: m, valor: real, isProjected: false });
    } else {
      const projected = scaleFactor * (weights.get(m) || 0);
      result.push({ mes: m, valor: projected, isProjected: true });
    }
  }

  return result;
}
