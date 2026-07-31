/** Utilidades para abrir rutas en Google Maps sin necesidad de API key. */

export interface Parada {
  cod_cliente: number;
  cliente: string;
  latitud: number | null;
  longitud: number | null;
}

/** Google Maps admite origen + destino + 8 puntos intermedios (10 paradas por enlace). */
export const MAX_PARADAS = 10;

const coord = (p: Parada) => `${p.latitud},${p.longitud}`;

export const tieneGeo = (p: Parada) => p.latitud != null && p.longitud != null;

/** Divide las paradas en tramos que Google Maps puede representar de una vez. */
export function tramos(paradas: Parada[]): Parada[][] {
  const geo = paradas.filter(tieneGeo);
  const out: Parada[][] = [];
  for (let i = 0; i < geo.length; i += MAX_PARADAS) out.push(geo.slice(i, i + MAX_PARADAS));
  return out;
}

/** URL de navegación con todas las paradas del tramo, en orden. */
export function urlRuta(paradas: Parada[]): string | null {
  const geo = paradas.filter(tieneGeo).slice(0, MAX_PARADAS);
  if (geo.length === 0) return null;
  if (geo.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coord(geo[0]))}`;
  }
  const destino = geo[geo.length - 1];
  const intermedios = geo.slice(0, -1);
  const params = new URLSearchParams({
    api: "1",
    destination: coord(destino),
    travelmode: "driving",
  });
  params.set("waypoints", intermedios.map(coord).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** URL para localizar un único cliente. */
export function urlCliente(p: Parada): string | null {
  if (!tieneGeo(p)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coord(p))}`;
}
