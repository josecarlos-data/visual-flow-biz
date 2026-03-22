/**
 * Dynamic year color palette.
 * - Current year (latest selected): green corporativo — highlights
 * - Previous year: grey-blue — secondary
 * - Year -2: soft terracotta/orange — discreet reference
 */
export function getYearColor(year: number, latestYear: number): string {
  if (year === latestYear) return "hsl(174, 100%, 29%)";       // verde corporativo
  if (year === latestYear - 1) return "hsl(210, 20%, 60%)";    // gris azulado
  return "hsl(25, 55%, 65%)";                                   // naranja suave / terracota
}
