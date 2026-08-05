DO $$
DECLARE r record;
BEGIN
  -- 1) Ningún visitante sin sesión puede ejecutar funciones internas
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;

  -- 2) Funciones internas que la app nunca llama desde el cliente
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname IN (
        'panel_dormidos','sembrar_geo_clientes','situaciones_activas',
        'fecha_corte_datos','puede_ver_margen','puede_revisar_visitas',
        'has_dashboard_access','importar_visitas_historicas','insertar_ventas_diarias'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- Las funciones usadas por las políticas de seguridad siguen disponibles
GRANT EXECUTE ON FUNCTION public.is_admin(uuid), public.is_approved(uuid),
  public.has_role(uuid, public.app_role), public.can_view_cliente(uuid, integer),
  public.get_user_delegacion(uuid), public.get_user_employee_code(uuid),
  public.get_user_zone_id(uuid), public.clientes_permitidos(uuid),
  public.puede_revisar_visitas(uuid)
  TO authenticated;