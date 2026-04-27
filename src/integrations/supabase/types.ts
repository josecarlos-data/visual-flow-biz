export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cliente: string
          cod_cliente: number
          created_at: string
          crecimiento_previsto: number | null
          delegacion: string | null
          gsmart_comercial: string | null
          gsmart_delegacion: string | null
          id: string
          localidad: string | null
          observaciones: string | null
          proyeccion_2026: number | null
          tipo_cliente: string | null
          top_truck: string | null
          transporte: number | null
          updated_at: string
          vendedor: string | null
        }
        Insert: {
          cliente: string
          cod_cliente: number
          created_at?: string
          crecimiento_previsto?: number | null
          delegacion?: string | null
          gsmart_comercial?: string | null
          gsmart_delegacion?: string | null
          id?: string
          localidad?: string | null
          observaciones?: string | null
          proyeccion_2026?: number | null
          tipo_cliente?: string | null
          top_truck?: string | null
          transporte?: number | null
          updated_at?: string
          vendedor?: string | null
        }
        Update: {
          cliente?: string
          cod_cliente?: number
          created_at?: string
          crecimiento_previsto?: number | null
          delegacion?: string | null
          gsmart_comercial?: string | null
          gsmart_delegacion?: string | null
          id?: string
          localidad?: string | null
          observaciones?: string | null
          proyeccion_2026?: number | null
          tipo_cliente?: string | null
          top_truck?: string | null
          transporte?: number | null
          updated_at?: string
          vendedor?: string | null
        }
        Relationships: []
      }
      compras: {
        Row: {
          categoria: string | null
          created_at: string
          fecha: string
          id: string
          importe: number
          proveedor: string
          referencia: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          fecha: string
          id?: string
          importe?: number
          proveedor: string
          referencia: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          fecha?: string
          id?: string
          importe?: number
          proveedor?: string
          referencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboards: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          is_active: boolean
          key: string
          name: string
          route: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          is_active?: boolean
          key: string
          name: string
          route: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          is_active?: boolean
          key?: string
          name?: string
          route?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      detalle_ventas: {
        Row: {
          cod_cliente: number
          created_at: string
          documento: string
          fecha: string
          id: string
          importe: number | null
          referencia: string
          vendedor: string | null
        }
        Insert: {
          cod_cliente: number
          created_at?: string
          documento: string
          fecha: string
          id?: string
          importe?: number | null
          referencia: string
          vendedor?: string | null
        }
        Update: {
          cod_cliente?: number
          created_at?: string
          documento?: string
          fecha?: string
          id?: string
          importe?: number | null
          referencia?: string
          vendedor?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          delegacion: string | null
          email: string | null
          employee_code: string | null
          full_name: string | null
          id: string
          is_approved: boolean
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          delegacion?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          delegacion?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      system_functions: {
        Row: {
          description: string | null
          excel_equivalent: string | null
          formula: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          excel_equivalent?: string | null
          formula: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          excel_equivalent?: string | null
          formula?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_dashboard_access: {
        Row: {
          created_at: string
          dashboard_key: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_key: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_key?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dashboard_access_dashboard_key_fkey"
            columns: ["dashboard_key"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ventas_mensuales: {
        Row: {
          anio: number
          cod_cliente: number
          created_at: string
          id: string
          mes: number
          valor: number
        }
        Insert: {
          anio: number
          cod_cliente: number
          created_at?: string
          id?: string
          mes: number
          valor?: number
        }
        Update: {
          anio?: number
          cod_cliente?: number
          created_at?: string
          id?: string
          mes?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_mensuales_cod_cliente_fkey"
            columns: ["cod_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["cod_cliente"]
          },
        ]
      }
      zones: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_distinct_delegaciones: {
        Args: never
        Returns: {
          delegacion: string
        }[]
      }
      get_distinct_vendedores: {
        Args: never
        Returns: {
          vendedor: string
        }[]
      }
      get_user_delegacion: { Args: { _user_id: string }; Returns: string }
      get_user_employee_code: { Args: { _user_id: string }; Returns: string }
      get_user_zone_id: { Args: { _user_id: string }; Returns: string }
      has_dashboard_access: {
        Args: { _dashboard_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "director_comercial" | "jefe_de_zona" | "comercial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "director_comercial", "jefe_de_zona", "comercial"],
    },
  },
} as const
