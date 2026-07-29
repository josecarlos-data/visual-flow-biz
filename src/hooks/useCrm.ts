import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cliente {
  cod_cliente: number;
  cliente: string;
  delegacion: string | null;
  localidad: string | null;
  provincia: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  vendedor: string | null;
  ruta: string | null;
  cod_tipo_cliente: string | null;
  observaciones_almacen: string | null;

}

export interface MotivoCampo {
  id: string;
  motivo_key: string;
  campo_key: string;
  label: string;
  ayuda: string | null;
  tipo: string;
  is_required: boolean;
  sort_order: number;
}

export interface Motivo {
  key: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  campos: MotivoCampo[];
}

export interface Visita {
  id: string;
  cod_cliente: number;
  motivo_key: string | null;
  fecha: string;
  vendedor: string | null;
  user_id: string | null;
  transcripcion: string | null;
  observaciones: string | null;
  campos: Record<string, unknown>;
  estado: string;
  origen: string;
  created_at: string;
}

export interface Planificada {
  id: string;
  user_id: string;
  cod_cliente: number;
  fecha: string;
  orden: number;
  estado: string;
  notas: string | null;
  visita_id: string | null;
}

/** Paginación en bloques de 1000 para saltar el límite de PostgREST. */
export async function fetchAll<T>(table: string, columns: string, order?: string): Promise<T[]> {
  const rows: T[] = [];
  const SIZE = 1000;
  for (let page = 0; page < 50; page++) {
    let q = supabase.from(table as never).select(columns).range(page * SIZE, page * SIZE + SIZE - 1);
    if (order) q = q.order(order, { ascending: true });
    const { data, error } = await q;
    if (error) throw error;
    const batch = (data ?? []) as unknown as T[];
    rows.push(...batch);
    if (batch.length < SIZE) break;
  }
  return rows;
}

export type OrdenClientes = "ventas" | "alfabetico";

export interface ClienteVisible extends Cliente {
  importe_actual: number;
  importe_anterior: number;
  ultima_compra: string | null;
  activo: boolean;
}

/** Listado de clientes visibles para el usuario, ordenado por ventas del año en curso. */
export function useClientes(soloActivos = true, orden: OrdenClientes = "ventas") {
  return useQuery({
    queryKey: ["crm_clientes", soloActivos],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const SIZE = 1000;
      const raw: Record<string, unknown>[] = [];
      for (let page = 0; page < 30; page++) {
        const { data, error } = await supabase
          .rpc("clientes_visibles" as never, { _solo_activos: soloActivos } as never)
          .range(page * SIZE, page * SIZE + SIZE - 1);
        if (error) throw error;
        const batch = (data ?? []) as unknown as Record<string, unknown>[];
        raw.push(...batch);
        if (batch.length < SIZE) break;
      }
      return raw.map((r) => ({
        cod_cliente: Number(r.cod_cliente),
        cliente: String(r.cliente ?? ""),
        delegacion: (r.delegacion as string) ?? null,
        localidad: (r.localidad as string) ?? null,

        provincia: null,
        direccion: null,
        telefono: null,
        email: null,
        vendedor: (r.vendedor as string) ?? null,
        ruta: (r.ruta as string) ?? null,
        cod_tipo_cliente: null,
        observaciones_almacen: null,

        importe_actual: Number(r.importe_actual ?? 0),
        importe_anterior: Number(r.importe_anterior ?? 0),
        ultima_compra: (r.ultima_compra as string) ?? null,
        activo: Boolean(r.activo),
      })) as ClienteVisible[];
    },
    select: (rows) =>
      orden === "alfabetico"
        ? [...rows].sort((a, b) => a.cliente.localeCompare(b.cliente, "es"))
        : rows,
  });
}

/** Parámetros de configuración de la aplicación. */
export function useAppSetting(key: string, fallback: string) {
  return useQuery({
    queryKey: ["app_setting", key],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings" as never)
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return ((data as { value?: string } | null)?.value ?? fallback) as string;
    },
  });
}


export function useCliente(cod: number | null) {
  return useQuery({
    queryKey: ["crm_cliente", cod],
    enabled: cod != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("cod_cliente", cod!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Cliente | null;
    },
  });
}

export function useClienteVentas(cod: number | null) {
  return useQuery({
    queryKey: ["crm_cliente_ventas", cod],
    enabled: cod != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventas_mensuales")
        .select("anio, mes, valor")
        .eq("cod_cliente", cod!);
      if (error) throw error;
      return (data ?? []) as { anio: number; mes: number; valor: number }[];
    },
  });
}

export function useClienteProductos(cod: number | null) {
  return useQuery({
    queryKey: ["crm_cliente_productos", cod],
    enabled: cod != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_productos")
        .select("referencia, descripcion, familia, importe, unidades, ultima_compra, anio")
        .eq("cod_cliente", cod!)
        .order("importe", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClienteVisitas(cod: number | null) {
  return useQuery({
    queryKey: ["crm_cliente_visitas", cod],
    enabled: cod != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitas")
        .select("*")
        .eq("cod_cliente", cod!)
        .order("fecha", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Visita[];
    },
  });
}

export function useVisitas(limit = 200) {
  return useQuery({
    queryKey: ["crm_visitas", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitas")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Visita[];
    },
  });
}

export function useMotivos() {
  return useQuery({
    queryKey: ["crm_motivos"],
    queryFn: async () => {
      const [mRes, cRes] = await Promise.all([
        supabase.from("motivos_visita").select("*").order("sort_order"),
        supabase.from("motivo_campos").select("*").order("sort_order"),
      ]);
      if (mRes.error) throw mRes.error;
      if (cRes.error) throw cRes.error;
      const campos = (cRes.data ?? []) as unknown as MotivoCampo[];
      return ((mRes.data ?? []) as unknown as Omit<Motivo, "campos">[]).map((m) => ({
        ...m,
        campos: campos.filter((c) => c.motivo_key === m.key),
      })) as Motivo[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgenda(desde: string, hasta: string) {
  return useQuery({
    queryKey: ["crm_agenda", desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitas_planificadas")
        .select("*")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha")
        .order("orden");
      if (error) throw error;
      return (data ?? []) as unknown as Planificada[];
    },
  });
}

export function useAgendaMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["crm_agenda"] });

  const add = useMutation({
    mutationFn: async (p: { user_id: string; cod_cliente: number; fecha: string; orden: number }) => {
      const { error } = await supabase.from("visitas_planificadas").insert(p);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Planificada>) => {
      const { error } = await supabase.from("visitas_planificadas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("visitas_planificadas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

export const eur = (v: number, decimals = 0) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v || 0);

export const fechaCorta = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
