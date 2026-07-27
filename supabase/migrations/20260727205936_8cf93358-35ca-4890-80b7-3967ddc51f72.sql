GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_zone_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_delegacion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_employee_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_dashboard_access(uuid, text) TO authenticated;