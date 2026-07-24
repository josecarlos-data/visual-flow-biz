
-- Lock down all SECURITY DEFINER helper functions from direct client execution
REVOKE EXECUTE ON FUNCTION public.has_dashboard_access(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_delegacion(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_employee_code(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_zone_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_self_escalation() FROM PUBLIC, anon, authenticated;

-- These two are intentionally callable by signed-in users via the client (dropdown data)
REVOKE EXECUTE ON FUNCTION public.get_distinct_delegaciones() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_distinct_vendedores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_distinct_delegaciones() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_distinct_vendedores() TO authenticated;
