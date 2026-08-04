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
  ventas_2024: number;
  ventas_2025: number;
  ventas_2026: number;
  ventas_mensuales: { anio: number; mes: number; valor: number }[];
}

interface UseHistoricoFilters {
  vendedores?: string[];
  delegaciones?: string[];
  /** Auto-filter by role: vendedor assigned to user profile */
  userVendedor?: string | null;
  /** Auto-filter by role: delegacion assigned to user profile */
  userDelegacion?: string | null;
}

async function fetchAllPaginated<T>(
  buildQuery: () => ReturnType<ReturnType<typeof supabase.from>["select"]>,
  pageSize = 1000
): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data as T[]);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export function useHistoricoData(filters?: UseHistoricoFilters) {
  return useQuery({
    queryKey: ["historico_data", filters],
    queryFn: async () => {
      // Determine effective filters (role-based + manual)
      const vendedorFilter = filters?.userVendedor
        ? [filters.userVendedor]
        : filters?.vendedores?.length
        ? filters.vendedores
        : undefined;

      const delegacionFilter = filters?.userDelegacion
        ? [filters.userDelegacion]
        : filters?.delegaciones?.length
        ? filters.delegaciones
        : undefined;

      // Fetch ALL clientes with pagination
      const clientes = await fetchAllPaginated<any>(() => {
        let q = supabase.from("clientes").select("*");
        if (vendedorFilter?.length) q = q.in("vendedor", vendedorFilter);
        if (delegacionFilter?.length) q = q.in("delegacion", delegacionFilter);
        return q;
      });

      if (!clientes || clientes.length === 0) return [];

      const codClientes = clientes.map((c) => c.cod_cliente);

      // Fetch ventas in batches
      let allVentas: { cod_cliente: number; anio: number; mes: number; valor: number }[] = [];
      const BATCH = 500;
      for (let i = 0; i < codClientes.length; i += BATCH) {
        const batch = codClientes.slice(i, i + BATCH);
        const ventas = await fetchAllPaginated<any>(() =>
          supabase
            .from("resumen_cliente_mes")
            .select("cod_cliente, anio, mes, importe")
            .in("cod_cliente", batch)
        );
        allVentas = allVentas.concat(
          ventas.map((v) => ({
            cod_cliente: v.cod_cliente,
            anio: v.anio,
            mes: v.mes,
            valor: Number(v.importe) || 0,
          }))
        );
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
      const { data, error } = await supabase.rpc("get_distinct_vendedores");
      if (error) throw error;
      return (data ?? []).map((d: { vendedor: string }) => d.vendedor);
    },
  });
}

export function useDelegaciones() {
  return useQuery({
    queryKey: ["delegaciones_list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_distinct_delegaciones");
      if (error) throw error;
      return (data ?? []).map((d: { delegacion: string }) => d.delegacion);
    },
  });
}
