import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SerieItem { q: number; anio: number; importe: number }

export interface ObjetivoSeguimiento {
  id: string;
  tipo: "cartera" | "ruta";
  vendedor: string;
  cod_vendedor: string | null;
  ruta: string | null;
  importe_objetivo: number;
  nota: string | null;
  activo: boolean;
  vendido: number;
  vendido_anterior_ytd: number;
  total_anterior: number;
  quincena_corte: number;
  fecha_corte: string;
  series: SerieItem[];
}

export interface PropuestaObjetivo {
  tipo: "cartera" | "ruta";
  vendedor: string;
  cod_vendedor: string | null;
  ruta: string | null;
  base_anio_anterior: number;
  importe_sugerido: number;
}

export interface VendedorObjetivo {
  vendedor: string;
  cod_vendedor: string | null;
  clientes: number;
  ruta_especial: string | null;
}

export interface ObjetivoInput {
  id?: string;
  anio: number;
  tipo: "cartera" | "ruta";
  vendedor: string;
  cod_vendedor?: string | null;
  ruta?: string | null;
  importe_objetivo: number;
  base_anio_anterior?: number;
  porcentaje?: number;
  nota?: string | null;
  activo?: boolean;
}

const num = (v: unknown) => Number(v ?? 0);

export function anioActual(): number {
  return new Date().getFullYear();
}

export function useObjetivosSeguimiento(anio: number) {
  return useQuery({
    queryKey: ["objetivos-seguimiento", anio],
    queryFn: async (): Promise<ObjetivoSeguimiento[]> => {
      const { data, error } = await supabase.rpc("objetivos_seguimiento", { _anio: anio });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        tipo: r.tipo,
        vendedor: r.vendedor,
        cod_vendedor: r.cod_vendedor,
        ruta: r.ruta,
        importe_objetivo: num(r.importe_objetivo),
        nota: r.nota,
        activo: r.activo,
        vendido: num(r.vendido),
        vendido_anterior_ytd: num(r.vendido_anterior_ytd),
        total_anterior: num(r.total_anterior),
        quincena_corte: num(r.quincena_corte),
        fecha_corte: r.fecha_corte,
        series: ((r.series ?? []) as any[]).map((s) => ({
          q: num(s.q),
          anio: num(s.anio),
          importe: num(s.importe),
        })),
      }));
    },
  });
}

export function useVendedoresObjetivos() {
  return useQuery({
    queryKey: ["vendedores-objetivos"],
    queryFn: async (): Promise<VendedorObjetivo[]> => {
      const { data, error } = await supabase.rpc("vendedores_objetivos");
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        vendedor: r.vendedor,
        cod_vendedor: r.cod_vendedor,
        clientes: num(r.clientes),
        ruta_especial: r.ruta_especial,
      }));
    },
  });
}

export function usePropuestaObjetivos(anio: number, pct: number, enabled: boolean) {
  return useQuery({
    queryKey: ["objetivos-propuesta", anio, pct],
    enabled,
    queryFn: async (): Promise<PropuestaObjetivo[]> => {
      const { data, error } = await supabase.rpc("objetivos_propuesta", { _anio: anio, _pct: pct });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        tipo: r.tipo,
        vendedor: r.vendedor,
        cod_vendedor: r.cod_vendedor,
        ruta: r.ruta,
        base_anio_anterior: num(r.base_anio_anterior),
        importe_sugerido: num(r.importe_sugerido),
      }));
    },
  });
}

export function useObjetivosMutations() {
  const qc = useQueryClient();
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["objetivos-seguimiento"] });
    qc.invalidateQueries({ queryKey: ["objetivos-propuesta"] });
  };

  const guardar = useMutation({
    mutationFn: async (input: ObjetivoInput) => {
      const fila = {
        anio: input.anio,
        tipo: input.tipo,
        vendedor: input.vendedor,
        cod_vendedor: input.cod_vendedor ?? null,
        ruta: input.tipo === "ruta" ? input.ruta ?? null : null,
        importe_objetivo: input.importe_objetivo,
        base_anio_anterior: input.base_anio_anterior ?? 0,
        porcentaje: input.porcentaje ?? 0,
        nota: input.nota ?? null,
        activo: input.activo ?? true,
      };
      if (input.id) {
        const { error } = await supabase.from("objetivos").update(fila).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("objetivos").insert(fila);
        if (error) throw error;
      }
    },
    onSuccess: invalidar,
  });

  const guardarLote = useMutation({
    mutationFn: async (filas: ObjetivoInput[]) => {
      if (!filas.length) return 0;
      const payload = filas.map((f) => ({
        anio: f.anio,
        tipo: f.tipo,
        vendedor: f.vendedor,
        cod_vendedor: f.cod_vendedor ?? null,
        ruta: f.tipo === "ruta" ? f.ruta ?? null : null,
        importe_objetivo: f.importe_objetivo,
        base_anio_anterior: f.base_anio_anterior ?? 0,
        porcentaje: f.porcentaje ?? 0,
        nota: f.nota ?? null,
        activo: true,
      }));
      const { error } = await supabase.from("objetivos").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: invalidar,
  });

  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("objetivos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });

  return { guardar, guardarLote, borrar };
}

/** Última quincena cerrada y cargada según los datos de ventas. */
export function useQuincenaCorte(anio: number) {
  return useQuery({
    queryKey: ["quincena-corte", anio],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("quincena_corte", { _anio: anio });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}
