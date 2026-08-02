/**
 * Motor de proyección QUINCENAL (24 quincenas por año).
 *
 * El año se divide en 24 quincenas: días 1-15 y 16-fin de cada mes, que coinciden
 * con los periodos de facturación de la empresa.
 *
 * El corte NO se toma del calendario del navegador: se calcula en base de datos a
 * partir de la última fecha de venta realmente cargada (`quincena_corte`), usando
 * únicamente la última quincena cerrada y cargada. Ejemplos:
 *   - datos hasta 28-feb  -> quincena 4 de 24
 *   - datos hasta 15-jul  -> quincena 13 de 24
 *   - datos hasta 29-jul  -> quincena 13 de 24 (la 14 aún no está cerrada)
 *
 * Proyección de cierre =
 *   ventas reales acumuladas hasta el corte / peso acumulado de esas mismas quincenas
 *   del año anterior.
 */

export const TOTAL_QUINCENAS = 24;

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export interface QuincenaValor {
  q: number; // 1..24
  valor: number;
}

export interface PuntoProyeccion {
  q: number;
  etiqueta: string;
  real: number | null;
  valor: number; // real si existe, proyectado si no
  proyectado: boolean;
  anterior: number;
}

export interface ResultadoProyeccion {
  quincenaCorte: number;
  vendido: number;
  proyeccion: number;
  pesoAcumulado: number;
  puntos: PuntoProyeccion[];
}

/** Índice de quincena (1..24) de una fecha. */
export function indiceQuincena(fecha: Date | string): number {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const mes = d.getMonth() + 1;
  const dia = d.getDate();
  return (mes - 1) * 2 + (dia <= 15 ? 1 : 2);
}

/** Etiqueta corta: "1ª Jul" / "2ª Jul". */
export function etiquetaQuincena(q: number): string {
  if (q < 1 || q > TOTAL_QUINCENAS) return "-";
  const mes = Math.ceil(q / 2);
  const mitad = q % 2 === 1 ? "1ª" : "2ª";
  return `${mitad} ${MESES[mes - 1]}`;
}

/** Etiqueta larga para explicar el corte: "quincena 13 de 24 · hasta 15/07". */
export function etiquetaCorte(q: number): string {
  if (q <= 0) return "sin datos del año";
  const mes = Math.ceil(q / 2);
  const finDia = q % 2 === 1 ? 15 : new Date(2001, mes, 0).getDate();
  const mm = String(mes).padStart(2, "0");
  return `quincena ${q} de 24 · hasta ${String(finDia).padStart(2, "0")}/${mm}`;
}

/** Pesos (que suman 1) de cada quincena a partir del año anterior. */
export function pesosQuincenales(previo: QuincenaValor[]): number[] {
  const acum = new Array(TOTAL_QUINCENAS + 1).fill(0);
  let total = 0;
  for (const v of previo) {
    if (v.q >= 1 && v.q <= TOTAL_QUINCENAS && v.valor > 0) {
      acum[v.q] += v.valor;
      total += v.valor;
    }
  }
  const conDatos = acum.filter((v) => v > 0).length;
  if (total <= 0 || conDatos < 8) {
    // Sin histórico suficiente: reparto uniforme
    return new Array(TOTAL_QUINCENAS + 1).fill(1 / TOTAL_QUINCENAS).map((v, i) => (i === 0 ? 0 : v));
  }
  return acum.map((v, i) => (i === 0 ? 0 : v / total));
}

export function calcularProyeccionQuincenal(
  actual: QuincenaValor[],
  previo: QuincenaValor[],
  quincenaCorte: number
): ResultadoProyeccion {
  const corte = Math.max(0, Math.min(TOTAL_QUINCENAS, Math.round(quincenaCorte || 0)));
  const pesos = pesosQuincenales(previo);

  const realMap = new Array(TOTAL_QUINCENAS + 1).fill(0);
  for (const v of actual) {
    if (v.q >= 1 && v.q <= TOTAL_QUINCENAS) realMap[v.q] += v.valor;
  }
  const antMap = new Array(TOTAL_QUINCENAS + 1).fill(0);
  for (const v of previo) {
    if (v.q >= 1 && v.q <= TOTAL_QUINCENAS) antMap[v.q] += v.valor;
  }

  let vendido = 0;
  let pesoAcumulado = 0;
  for (let q = 1; q <= corte; q++) {
    vendido += realMap[q];
    pesoAcumulado += pesos[q];
  }

  const proyeccion = pesoAcumulado > 0 ? vendido / pesoAcumulado : vendido;

  const puntos: PuntoProyeccion[] = [];
  for (let q = 1; q <= TOTAL_QUINCENAS; q++) {
    const esReal = q <= corte;
    puntos.push({
      q,
      etiqueta: etiquetaQuincena(q),
      real: esReal ? realMap[q] : null,
      valor: esReal ? realMap[q] : proyeccion * pesos[q],
      proyectado: !esReal,
      anterior: antMap[q],
    });
  }

  return { quincenaCorte: corte, vendido, proyeccion, pesoAcumulado, puntos };
}

/** Ritmo necesario para alcanzar un objetivo en las quincenas que quedan. */
export function ritmoNecesario(objetivo: number, vendido: number, quincenaCorte: number) {
  const restantes = Math.max(0, TOTAL_QUINCENAS - quincenaCorte);
  const pendiente = Math.max(0, objetivo - vendido);
  return {
    restantes,
    pendiente,
    porQuincena: restantes > 0 ? pendiente / restantes : pendiente,
  };
}

export interface PuntoMes {
  mes: number; // 1..12
  etiqueta: string; // "Ene"
  anterior: number;
  real: number | null;
  proyectado: number | null;
  parcial: boolean;
}

/**
 * Agrupa los 24 puntos quincenales en 12 meses para visualización móvil.
 * - `real`: suma de las quincenas ya facturadas del mes (null si el mes no tiene datos reales).
 * - `proyectado`: valor total estimado del mes (real + quincenas proyectadas). Se rellena
 *   también en el último mes con datos reales para que la línea discontinua enlace sin hueco.
 * - `parcial`: el mes tiene una quincena real y otra aún no facturada.
 */
export function agruparPorMes(puntos: PuntoProyeccion[]): PuntoMes[] {
  const meses: PuntoMes[] = MESES.map((etiqueta, i) => ({
    mes: i + 1,
    etiqueta,
    anterior: 0,
    real: null,
    proyectado: null,
    parcial: false,
  }));

  const acumReal = new Array(13).fill(0);
  const acumTotal = new Array(13).fill(0);
  const nReal = new Array(13).fill(0);
  const nProy = new Array(13).fill(0);

  for (const p of puntos) {
    const m = Math.ceil(p.q / 2);
    if (m < 1 || m > 12) continue;
    meses[m - 1].anterior += p.anterior;
    acumTotal[m] += p.valor;
    if (p.proyectado) {
      nProy[m] += 1;
    } else {
      acumReal[m] += p.valor;
      nReal[m] += 1;
    }
  }

  let ultimoMesReal = 0;
  for (let m = 1; m <= 12; m++) {
    const mes = meses[m - 1];
    if (nReal[m] > 0) {
      mes.real = acumReal[m];
      mes.parcial = nProy[m] > 0;
      ultimoMesReal = m;
    }
    if (nProy[m] > 0) mes.proyectado = acumTotal[m];
  }

  // Enlaza la línea discontinua con el último punto real
  if (ultimoMesReal > 0 && meses[ultimoMesReal - 1].proyectado === null) {
    meses[ultimoMesReal - 1].proyectado = meses[ultimoMesReal - 1].real;
  }

  return meses;
}
