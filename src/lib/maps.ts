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

/* --------------------------------------------------------------------------
 * Optimización de recorrido por cercanía
 * ------------------------------------------------------------------------ */

export interface Punto {
  latitud: number;
  longitud: number;
}

const RAD = Math.PI / 180;

/** Distancia en kilómetros entre dos puntos (fórmula de haversine). */
export function distanciaKm(a: Punto, b: Punto): number {
  const dLat = (b.latitud - a.latitud) * RAD;
  const dLon = (b.longitud - a.longitud) * RAD;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitud * RAD) * Math.cos(b.latitud * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Ordena las paradas por cercanía (vecino más próximo) partiendo del origen dado.
 * Si no hay origen, arranca por la primera parada con coordenadas.
 * Las paradas sin ubicación se devuelven al final, en su orden original.
 */
export function optimizarRuta<T extends Parada>(paradas: T[], origen?: Punto | null): T[] {
  const geo = paradas.filter(tieneGeo);
  const sinGeo = paradas.filter((p) => !tieneGeo(p));
  if (geo.length <= 1) return [...geo, ...sinGeo];

  const pendientes = [...geo];
  const orden: T[] = [];
  let actual: Punto =
    origen ?? { latitud: pendientes[0].latitud as number, longitud: pendientes[0].longitud as number };

  while (pendientes.length > 0) {
    let mejor = 0;
    let mejorD = Infinity;
    for (let i = 0; i < pendientes.length; i++) {
      const d = distanciaKm(actual, {
        latitud: pendientes[i].latitud as number,
        longitud: pendientes[i].longitud as number,
      });
      if (d < mejorD) {
        mejorD = d;
        mejor = i;
      }
    }
    const [elegido] = pendientes.splice(mejor, 1);
    orden.push(elegido);
    actual = { latitud: elegido.latitud as number, longitud: elegido.longitud as number };
  }

  return [...orden, ...sinGeo];
}

/** Kilómetros totales de un recorrido (solo paradas con ubicación). */
export function distanciaTotalKm(paradas: Parada[], origen?: Punto | null): number {
  const geo = paradas.filter(tieneGeo);
  let total = 0;
  let prev: Punto | null = origen ?? null;
  for (const p of geo) {
    const punto = { latitud: p.latitud as number, longitud: p.longitud as number };
    if (prev) total += distanciaKm(prev, punto);
    prev = punto;
  }
  return total;
}

/** Posición GPS actual del usuario; null si no la concede o no está disponible. */
export function posicionActual(timeoutMs = 8000): Promise<Punto | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitud: pos.coords.latitude, longitud: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

