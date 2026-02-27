import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type HistoricoRow = Tables<"historico_facturacion">;

interface UseHistoricoFilters {
  vendedores?: string[];
  delegaciones?: string[];
}

export function useHistoricoData(filters?: UseHistoricoFilters) {
  return useQuery({
    queryKey: ["historico_facturacion", filters],
    queryFn: async () => {
      let query = supabase
        .from("historico_facturacion")
        .select("*")
        .order("ventas_2025", { ascending: false });

      if (filters?.vendedores && filters.vendedores.length > 0) {
        query = query.in("vendedor", filters.vendedores);
      }
      if (filters?.delegaciones && filters.delegaciones.length > 0) {
        query = query.in("delegacion", filters.delegaciones);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HistoricoRow[];
    },
  });
}

export function useVendedores() {
  return useQuery({
    queryKey: ["vendedores_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_facturacion")
        .select("vendedor")
        .order("vendedor");
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((d) => d.vendedor))];
      return unique;
    },
  });
}

export function useDelegaciones() {
  return useQuery({
    queryKey: ["delegaciones_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_facturacion")
        .select("delegacion")
        .not("delegacion", "is", null)
        .order("delegacion");
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((d) => d.delegacion).filter(Boolean))] as string[];
      return unique;
    },
  });
}
