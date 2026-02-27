import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClienteConVentas {
  cod_cliente: number;
  cliente: string;
  delegacion: string | null;
  localidad: string | null;
  vendedor: string | null;
  tipo_cliente: string | null;
  proyeccion_2026: number | null;
  crecimiento_previsto: number | null;
  top_truck: string | null;
  gsmart_delegacion: string | null;
  gsmart_comercial: string | null;
  // Aggregated yearly totals
  ventas_2024: number;
  ventas_2025: number;
  ventas_2026: number;
  // Monthly breakdown
  ventas_mensuales: { anio: number; mes: number; valor: number }[];
}

interface UseHistoricoFilters {
  vendedores?: string[];
  delegaciones?: string[];
}

export function useHistoricoData(filters?: UseHistoricoFilters) {
  return useQuery({
    queryKey: ["historico_data", filters],
    queryFn: async () => {
      // Fetch clientes
      let clienteQuery = supabase.from("clientes").select("*");
      if (filters?.vendedores?.length) clienteQuery = clienteQuery.in("vendedor", filters.vendedores);
      if (filters?.delegaciones?.length) clienteQuery = clienteQuery.in("delegacion", filters.delegaciones);

      const { data: clientes, error: cErr } = await clienteQuery;
      if (cErr) throw cErr;
      if (!clientes || clientes.length === 0) return [];

      const codClientes = clientes.map((c) => c.cod_cliente);

      // Fetch ventas in batches if needed (supabase limit is 1000)
      let allVentas: { cod_cliente: number; anio: number; mes: number; valor: number }[] = [];
      const BATCH = 500;
      for (let i = 0; i < codClientes.length; i += BATCH) {
        const batch = codClientes.slice(i, i + BATCH);
        const { data: ventas, error: vErr } = await supabase
          .from("ventas_mensuales")
          .select("cod_cliente, anio, mes, valor")
          .in("cod_cliente", batch);
        if (vErr) throw vErr;
        if (ventas) allVentas = allVentas.concat(ventas.map((v) => ({
          cod_cliente: v.cod_cliente,
          anio: v.anio,
          mes: v.mes,
          valor: Number(v.valor) || 0,
        })));
      }

      // Group ventas by cod_cliente
      const ventasMap = new Map<number, { anio: number; mes: number; valor: number }[]>();
      for (const v of allVentas) {
        if (!ventasMap.has(v.cod_cliente)) ventasMap.set(v.cod_cliente, []);
        ventasMap.get(v.cod_cliente)!.push(v);
      }

      // Merge
      const result: ClienteConVentas[] = clientes.map((c) => {
        const ventas = ventasMap.get(c.cod_cliente) || [];
        const sumYear = (y: number) => ventas.filter((v) => v.anio === y).reduce((s, v) => s + v.valor, 0);
        return {
          cod_cliente: c.cod_cliente,
          cliente: c.cliente,
          delegacion: c.delegacion,
          localidad: c.localidad,
          vendedor: c.vendedor,
          tipo_cliente: c.tipo_cliente,
          proyeccion_2026: c.proyeccion_2026 ? Number(c.proyeccion_2026) : null,
          crecimiento_previsto: c.crecimiento_previsto ? Number(c.crecimiento_previsto) : null,
          top_truck: c.top_truck,
          gsmart_delegacion: c.gsmart_delegacion,
          gsmart_comercial: c.gsmart_comercial,
          ventas_2024: sumYear(2024),
          ventas_2025: sumYear(2025),
          ventas_2026: sumYear(2026),
          ventas_mensuales: ventas,
        };
      });

      return result.sort((a, b) => b.ventas_2025 - a.ventas_2025);
    },
  });
}

export function useVendedores() {
  return useQuery({
    queryKey: ["vendedores_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("vendedor")
        .not("vendedor", "is", null)
        .order("vendedor");
      if (error) throw error;
      return [...new Set((data ?? []).map((d) => d.vendedor).filter(Boolean))] as string[];
    },
  });
}

export function useDelegaciones() {
  return useQuery({
    queryKey: ["delegaciones_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("delegacion")
        .not("delegacion", "is", null)
        .order("delegacion");
      if (error) throw error;
      return [...new Set((data ?? []).map((d) => d.delegacion).filter(Boolean))] as string[];
    },
  });
}
