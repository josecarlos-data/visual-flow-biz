import { describe, expect, it } from "vitest";
import {
  calcularProyeccionQuincenal,
  etiquetaCorte,
  etiquetaQuincena,
  indiceQuincena,
  pesosQuincenales,
  ritmoNecesario,
} from "@/lib/projectionQuincenal";

describe("indiceQuincena", () => {
  it("asigna la primera quincena hasta el día 15", () => {
    expect(indiceQuincena(new Date(2026, 0, 1))).toBe(1);
    expect(indiceQuincena(new Date(2026, 0, 15))).toBe(1);
    expect(indiceQuincena(new Date(2026, 0, 16))).toBe(2);
    expect(indiceQuincena(new Date(2026, 6, 15))).toBe(13);
    expect(indiceQuincena(new Date(2026, 11, 31))).toBe(24);
  });
});

describe("etiquetas", () => {
  it("describe la quincena y el corte", () => {
    expect(etiquetaQuincena(13)).toBe("1ª Jul");
    expect(etiquetaQuincena(14)).toBe("2ª Jul");
    expect(etiquetaCorte(13)).toContain("quincena 13 de 24");
    expect(etiquetaCorte(4)).toContain("28/02");
  });
});

describe("pesosQuincenales", () => {
  it("reparte uniforme sin histórico", () => {
    const p = pesosQuincenales([]);
    expect(p[1]).toBeCloseTo(1 / 24);
  });

  it("usa el perfil del año anterior", () => {
    const previo = Array.from({ length: 24 }, (_, i) => ({ q: i + 1, valor: i < 12 ? 200 : 100 }));
    const p = pesosQuincenales(previo);
    expect(p[1]).toBeCloseTo(200 / 3600);
    expect(p.slice(1).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});

describe("calcularProyeccionQuincenal", () => {
  const previo = Array.from({ length: 24 }, (_, i) => ({ q: i + 1, valor: 100 }));

  it("proyecta el cierre a partir de las quincenas cerradas", () => {
    const actual = Array.from({ length: 13 }, (_, i) => ({ q: i + 1, valor: 120 }));
    const r = calcularProyeccionQuincenal(actual, previo, 13);
    expect(r.vendido).toBe(1560);
    expect(r.proyeccion).toBeCloseTo(2880); // 120 * 24
    expect(r.puntos.filter((p) => p.proyectado)).toHaveLength(11);
  });

  it("ignora ventas posteriores al corte", () => {
    const actual = [
      ...Array.from({ length: 13 }, (_, i) => ({ q: i + 1, valor: 100 })),
      { q: 14, valor: 999999 },
    ];
    const r = calcularProyeccionQuincenal(actual, previo, 13);
    expect(r.vendido).toBe(1300);
    expect(r.proyeccion).toBeCloseTo(2400);
  });

  it("devuelve cero sin datos", () => {
    const r = calcularProyeccionQuincenal([], previo, 0);
    expect(r.vendido).toBe(0);
    expect(r.proyeccion).toBe(0);
  });
});

describe("ritmoNecesario", () => {
  it("reparte lo pendiente entre las quincenas restantes", () => {
    const r = ritmoNecesario(2400, 1300, 13);
    expect(r.restantes).toBe(11);
    expect(r.pendiente).toBe(1100);
    expect(r.porQuincena).toBeCloseTo(100);
  });
});
