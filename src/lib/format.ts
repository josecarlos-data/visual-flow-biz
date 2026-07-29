/** Formato numérico español: miles con "." y decimales con ",". */

const LOCALE = "es-ES";

export const num = (v: number | null | undefined, decimals = 0): string =>
  new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(v ?? 0));

/** Importe en euros. KPIs y gráficos: 0 decimales. Tablas de detalle: 2. */
export const eur = (v: number | null | undefined, decimals = 0): string =>
  new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(v ?? 0));

/** Miles abreviados para ejes de gráficos: 1.234.567 -> 1.235k */
export const eurK = (v: number | null | undefined): string => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1000) return `${num(n / 1000)}k`;
  return num(n);
};

export const pct = (v: number | null | undefined, decimals = 1): string =>
  `${num(v, decimals)}%`;

export const fecha = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

export const fechaCorta = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleDateString(LOCALE, { day: "2-digit", month: "short" }) : "-";
