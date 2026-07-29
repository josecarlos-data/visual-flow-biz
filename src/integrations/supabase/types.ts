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
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      cliente_insights: {
        Row: {
          alertas: Json
          argumentario: Json
          cod_cliente: number
          created_at: string
          generado_en: string
          id: string
          oportunidades: Json
          resumen: string | null
          updated_at: string
        }
        Insert: {
          alertas?: Json
          argumentario?: Json
          cod_cliente: number
          created_at?: string
          generado_en?: string
          id?: string
          oportunidades?: Json
          resumen?: string | null
          updated_at?: string
        }
        Update: {
          alertas?: Json
          argumentario?: Json
          cod_cliente?: number
          created_at?: string
          generado_en?: string
          id?: string
          oportunidades?: Json
          resumen?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cliente_kpis: {
        Row: {
          actualizado_en: string
          cod_cliente: number
          dias_sin_comprar: number | null
          importe_anio_actual: number
          importe_anio_anterior: number
          importe_anio_anterior_ytd: number
          importe_total: number
          margen_anio_actual: number
          margen_anio_anterior: number
          margen_total: number
          num_lineas: number
          num_referencias: number
          primera_compra: string | null
          ultima_compra: string | null
        }
        Insert: {
          actualizado_en?: string
          cod_cliente: number
          dias_sin_comprar?: number | null
          importe_anio_actual?: number
          importe_anio_anterior?: number
          importe_anio_anterior_ytd?: number
          importe_total?: number
          margen_anio_actual?: number
          margen_anio_anterior?: number
          margen_total?: number
          num_lineas?: number
          num_referencias?: number
          primera_compra?: string | null
          ultima_compra?: string | null
        }
        Update: {
          actualizado_en?: string
          cod_cliente?: number
          dias_sin_comprar?: number | null
          importe_anio_actual?: number
          importe_anio_anterior?: number
          importe_anio_anterior_ytd?: number
          importe_total?: number
          margen_anio_actual?: number
          margen_anio_anterior?: number
          margen_total?: number
          num_lineas?: number
          num_referencias?: number
          primera_compra?: string | null
          ultima_compra?: string | null
        }
        Relationships: []
      }
      cliente_productos: {
        Row: {
          anio: number | null
          cod_cliente: number
          created_at: string
          descripcion: string | null
          familia: string | null
          id: string
          importe: number
          referencia: string
          ultima_compra: string | null
          unidades: number
          updated_at: string
        }
        Insert: {
          anio?: number | null
          cod_cliente: number
          created_at?: string
          descripcion?: string | null
          familia?: string | null
          id?: string
          importe?: number
          referencia: string
          ultima_compra?: string | null
          unidades?: number
          updated_at?: string
        }
        Update: {
          anio?: number | null
          cod_cliente?: number
          created_at?: string
          descripcion?: string | null
          familia?: string | null
          id?: string
          importe?: number
          referencia?: string
          ultima_compra?: string | null
          unidades?: number
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cif: string | null
          cliente: string
          cod_cliente: number
          cod_delegacion: string | null
          cod_postal: string | null
          cod_prohibicion_venta: string | null
          cod_rappel: string | null
          cod_tipo_cliente: string | null
          cod_vendedor: string | null
          created_at: string
          crecimiento_previsto: number | null
          delegacion: string | null
          direccion: string | null
          email: string | null
          extra: Json
          fecha_alta: string | null
          grupo: string | null
          grupo_rappel: string | null
          gsmart_comercial: string | null
          gsmart_delegacion: string | null
          id: string
          localidad: string | null
          num_empleados_taller: number | null
          observaciones_almacen: string | null
          persona_contacto: string | null
          prohibicion_venta: string | null
          provincia: string | null
          proyeccion_2026: number | null
          razon_social: string | null
          ruta: string | null
          ruta_comercial: string | null
          ruta_especial: string | null
          telefono: string | null
          telefono2: string | null
          tipo_cliente: string | null
          top_truck: boolean
          tramos_rappel: string | null
          transporte: number | null
          updated_at: string
          vendedor: string | null
          web: string | null
        }
        Insert: {
          cif?: string | null
          cliente: string
          cod_cliente: number
          cod_delegacion?: string | null
          cod_postal?: string | null
          cod_prohibicion_venta?: string | null
          cod_rappel?: string | null
          cod_tipo_cliente?: string | null
          cod_vendedor?: string | null
          created_at?: string
          crecimiento_previsto?: number | null
          delegacion?: string | null
          direccion?: string | null
          email?: string | null
          extra?: Json
          fecha_alta?: string | null
          grupo?: string | null
          grupo_rappel?: string | null
          gsmart_comercial?: string | null
          gsmart_delegacion?: string | null
          id?: string
          localidad?: string | null
          num_empleados_taller?: number | null
          observaciones_almacen?: string | null
          persona_contacto?: string | null
          prohibicion_venta?: string | null
          provincia?: string | null
          proyeccion_2026?: number | null
          razon_social?: string | null
          ruta?: string | null
          ruta_comercial?: string | null
          ruta_especial?: string | null
          telefono?: string | null
          telefono2?: string | null
          tipo_cliente?: string | null
          top_truck?: boolean
          tramos_rappel?: string | null
          transporte?: number | null
          updated_at?: string
          vendedor?: string | null
          web?: string | null
        }
        Update: {
          cif?: string | null
          cliente?: string
          cod_cliente?: number
          cod_delegacion?: string | null
          cod_postal?: string | null
          cod_prohibicion_venta?: string | null
          cod_rappel?: string | null
          cod_tipo_cliente?: string | null
          cod_vendedor?: string | null
          created_at?: string
          crecimiento_previsto?: number | null
          delegacion?: string | null
          direccion?: string | null
          email?: string | null
          extra?: Json
          fecha_alta?: string | null
          grupo?: string | null
          grupo_rappel?: string | null
          gsmart_comercial?: string | null
          gsmart_delegacion?: string | null
          id?: string
          localidad?: string | null
          num_empleados_taller?: number | null
          observaciones_almacen?: string | null
          persona_contacto?: string | null
          prohibicion_venta?: string | null
          provincia?: string | null
          proyeccion_2026?: number | null
          razon_social?: string | null
          ruta?: string | null
          ruta_comercial?: string | null
          ruta_especial?: string | null
          telefono?: string | null
          telefono2?: string | null
          tipo_cliente?: string | null
          top_truck?: boolean
          tramos_rappel?: string | null
          transporte?: number | null
          updated_at?: string
          vendedor?: string | null
          web?: string | null
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
      motivo_campos: {
        Row: {
          ayuda: string | null
          campo_key: string
          created_at: string
          id: string
          is_required: boolean
          label: string
          motivo_key: string
          opciones: Json
          placeholder: string | null
          sort_order: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ayuda?: string | null
          campo_key: string
          created_at?: string
          id?: string
          is_required?: boolean
          label: string
          motivo_key: string
          opciones?: Json
          placeholder?: string | null
          sort_order?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          ayuda?: string | null
          campo_key?: string
          created_at?: string
          id?: string
          is_required?: boolean
          label?: string
          motivo_key?: string
          opciones?: Json
          placeholder?: string | null
          sort_order?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "motivo_campos_motivo_key_fkey"
            columns: ["motivo_key"]
            isOneToOne: false
            referencedRelation: "motivos_visita"
            referencedColumns: ["key"]
          },
        ]
      }
      motivos_visita: {
        Row: {
          color: string | null
          created_at: string
          descripcion: string | null
          is_active: boolean
          key: string
          nombre: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          descripcion?: string | null
          is_active?: boolean
          key: string
          nombre: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          descripcion?: string | null
          is_active?: boolean
          key?: string
          nombre?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          cod_proveedor: string | null
          created_at: string
          descripcion: string | null
          estado: string | null
          familia: string | null
          familia_marca: string | null
          familia_nombre: string | null
          id: string
          importe_periodo: number | null
          marca: string | null
          marca_nombre: string | null
          observaciones: string | null
          precio: number | null
          primera_venta: string | null
          proveedor: string | null
          referencia: string
          sustituida_por: string | null
          sustituye_a: string | null
          ultima_venta: string | null
          unidades_periodo: number | null
          updated_at: string
        }
        Insert: {
          cod_proveedor?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: string | null
          familia?: string | null
          familia_marca?: string | null
          familia_nombre?: string | null
          id?: string
          importe_periodo?: number | null
          marca?: string | null
          marca_nombre?: string | null
          observaciones?: string | null
          precio?: number | null
          primera_venta?: string | null
          proveedor?: string | null
          referencia: string
          sustituida_por?: string | null
          sustituye_a?: string | null
          ultima_venta?: string | null
          unidades_periodo?: number | null
          updated_at?: string
        }
        Update: {
          cod_proveedor?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: string | null
          familia?: string | null
          familia_marca?: string | null
          familia_nombre?: string | null
          id?: string
          importe_periodo?: number | null
          marca?: string | null
          marca_nombre?: string | null
          observaciones?: string | null
          precio?: number | null
          primera_venta?: string | null
          proveedor?: string | null
          referencia?: string
          sustituida_por?: string | null
          sustituye_a?: string | null
          ultima_venta?: string | null
          unidades_periodo?: number | null
          updated_at?: string
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
          ver_margen: boolean
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
          ver_margen?: boolean
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
          ver_margen?: boolean
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
      resumen_cliente_familia: {
        Row: {
          anio: number
          cod_cliente: number
          familia: string
          importe: number
          margen: number
          ultima_compra: string | null
          unidades: number
        }
        Insert: {
          anio: number
          cod_cliente: number
          familia: string
          importe?: number
          margen?: number
          ultima_compra?: string | null
          unidades?: number
        }
        Update: {
          anio?: number
          cod_cliente?: number
          familia?: string
          importe?: number
          margen?: number
          ultima_compra?: string | null
          unidades?: number
        }
        Relationships: []
      }
      resumen_cliente_marca: {
        Row: {
          anio: number
          cod_cliente: number
          importe: number
          marca: string
          margen: number
          unidades: number
        }
        Insert: {
          anio: number
          cod_cliente: number
          importe?: number
          marca: string
          margen?: number
          unidades?: number
        }
        Update: {
          anio?: number
          cod_cliente?: number
          importe?: number
          marca?: string
          margen?: number
          unidades?: number
        }
        Relationships: []
      }
      resumen_cliente_mes: {
        Row: {
          anio: number
          cod_cliente: number
          importe: number
          lineas: number
          margen: number
          mes: number
          unidades: number
        }
        Insert: {
          anio: number
          cod_cliente: number
          importe?: number
          lineas?: number
          margen?: number
          mes: number
          unidades?: number
        }
        Update: {
          anio?: number
          cod_cliente?: number
          importe?: number
          lineas?: number
          margen?: number
          mes?: number
          unidades?: number
        }
        Relationships: []
      }
      rutas: {
        Row: {
          codigo: string
          created_at: string
          delegacion: string | null
          id: string
          nombre: string
          updated_at: string
          vendedor: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          delegacion?: string | null
          id?: string
          nombre: string
          updated_at?: string
          vendedor?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          delegacion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
          vendedor?: string | null
        }
        Relationships: []
      }
      sync_config: {
        Row: {
          created_at: string
          dataset_key: string
          file_url: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_message: string | null
          last_sync_status: string | null
          sheet_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dataset_key: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          sheet_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dataset_key?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          sheet_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          created_at: string
          dataset_key: string
          id: string
          message: string | null
          rows_processed: number
          status: string
        }
        Insert: {
          created_at?: string
          dataset_key: string
          id?: string
          message?: string | null
          rows_processed?: number
          status: string
        }
        Update: {
          created_at?: string
          dataset_key?: string
          id?: string
          message?: string | null
          rows_processed?: number
          status?: string
        }
        Relationships: []
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
      ventas_diarias: {
        Row: {
          cod_cliente: number
          created_at: string
          familia: string | null
          fecha: string
          id: number
          importe: number
          marca: string | null
          margen: number
          referencia: string
          unidades: number
        }
        Insert: {
          cod_cliente: number
          created_at?: string
          familia?: string | null
          fecha: string
          id?: never
          importe?: number
          marca?: string | null
          margen?: number
          referencia: string
          unidades?: number
        }
        Update: {
          cod_cliente?: number
          created_at?: string
          familia?: string | null
          fecha?: string
          id?: never
          importe?: number
          marca?: string | null
          margen?: number
          referencia?: string
          unidades?: number
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
      visitas: {
        Row: {
          campos: Json
          cliente_externo: string | null
          cod_cliente: number | null
          comercial_nombre: string | null
          created_at: string
          estado: string
          fecha: string
          hora: string | null
          id: string
          latitud: number | null
          longitud: number | null
          motivo_key: string | null
          observaciones: string | null
          origen: string
          ruta: string | null
          tipo: string
          titulo: string | null
          transcripcion: string | null
          updated_at: string
          user_id: string | null
          validacion: string | null
          vendedor: string | null
          zona: string | null
        }
        Insert: {
          campos?: Json
          cliente_externo?: string | null
          cod_cliente?: number | null
          comercial_nombre?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          hora?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          motivo_key?: string | null
          observaciones?: string | null
          origen?: string
          ruta?: string | null
          tipo?: string
          titulo?: string | null
          transcripcion?: string | null
          updated_at?: string
          user_id?: string | null
          validacion?: string | null
          vendedor?: string | null
          zona?: string | null
        }
        Update: {
          campos?: Json
          cliente_externo?: string | null
          cod_cliente?: number | null
          comercial_nombre?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          hora?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          motivo_key?: string | null
          observaciones?: string | null
          origen?: string
          ruta?: string | null
          tipo?: string
          titulo?: string | null
          transcripcion?: string | null
          updated_at?: string
          user_id?: string | null
          validacion?: string | null
          vendedor?: string | null
          zona?: string | null
        }
        Relationships: []
      }
      visitas_planificadas: {
        Row: {
          cod_cliente: number
          created_at: string
          estado: string
          fecha: string
          id: string
          notas: string | null
          orden: number
          updated_at: string
          user_id: string
          visita_id: string | null
        }
        Insert: {
          cod_cliente: number
          created_at?: string
          estado?: string
          fecha: string
          id?: string
          notas?: string | null
          orden?: number
          updated_at?: string
          user_id: string
          visita_id?: string | null
        }
        Update: {
          cod_cliente?: number
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          notas?: string | null
          orden?: number
          updated_at?: string
          user_id?: string
          visita_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitas_planificadas_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
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
      can_view_cliente: {
        Args: { _cod: number; _user_id: string }
        Returns: boolean
      }
      clientes_permitidos: {
        Args: { _user_id: string }
        Returns: {
          cod_cliente: number
        }[]
      }
      clientes_visibles: {
        Args: { _anios?: number; _solo_activos?: boolean }
        Returns: {
          activo: boolean
          cliente: string
          cod_cliente: number
          delegacion: string
          importe_actual: number
          importe_anterior: number
          localidad: string
          ruta: string
          ultima_compra: string
          vendedor: string
        }[]
      }
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
      importar_visitas_historicas: {
        Args: { _reset?: boolean; _rows: Json }
        Returns: number
      }
      insertar_ventas_diarias: {
        Args: { _reset?: boolean; _rows: Json }
        Returns: number
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      panel_alertas: {
        Args: { _limite?: number }
        Returns: {
          cliente: string
          cod_cliente: number
          dias: number
          tipo: string
          valor: number
          valor_ref: number
          vendedor: string
        }[]
      }
      panel_dormidos: {
        Args: { _limite?: number }
        Returns: {
          cliente: string
          cod_cliente: number
          importe_total: number
          ultima_compra: string
          vendedor: string
        }[]
      }
      panel_top_clientes: {
        Args: { _anio: number; _limite?: number }
        Returns: {
          cliente: string
          cod_cliente: number
          importe: number
          margen: number
          vendedor: string
        }[]
      }
      panel_top_familias: {
        Args: { _anio: number; _limite?: number }
        Returns: {
          familia: string
          importe: number
          margen: number
        }[]
      }
      panel_top_marcas: {
        Args: { _anio: number; _limite?: number }
        Returns: {
          importe: number
          marca: string
          margen: number
        }[]
      }
      panel_ventas_kpis: {
        Args: never
        Returns: {
          anio: number
          clientes: number
          importe: number
          lineas: number
          margen: number
          unidades: number
        }[]
      }
      panel_ventas_mensual: {
        Args: never
        Returns: {
          anio: number
          importe: number
          margen: number
          mes: number
          unidades: number
        }[]
      }
      puede_ver_margen: { Args: { _user_id: string }; Returns: boolean }
      refrescar_resumenes_admin: { Args: never; Returns: undefined }
      refrescar_resumenes_ventas: { Args: never; Returns: undefined }
      reset_maestro_isi_data: { Args: never; Returns: undefined }
      upsert_clientes_maestro: { Args: { _rows: Json }; Returns: number }
      upsert_productos_maestro: { Args: { _rows: Json }; Returns: number }
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
