## Causa confirmada

Las contraseñas son correctas y **los 4 usuarios están aprobados** en la base de datos (`is_approved = true`). El bloqueo no es de aprobación.

En el arreglo de seguridad anterior se revocó `EXECUTE` a `authenticated` sobre las funciones auxiliares `is_admin`, `has_role`, `get_user_zone_id` y `has_dashboard_access` (verificado: sus permisos actuales solo incluyen `postgres` y `service_role`).

Pero esas mismas funciones se usan dentro de las políticas RLS de `profiles` (y de casi todas las tablas). Al evaluar la política, Postgres devuelve "permission denied for function" → la consulta del perfil falla → el hook de auth cae al `catch` y pone `isApproved = false` → redirección a **/pending**. De ahí que entre con contraseña correcta y se quede atascado.

## Solución

1. **Migración**: volver a conceder `EXECUTE` a `authenticated` (y `anon` donde la política lo requiera durante el arranque de sesión) sobre:
   - `public.is_admin(uuid)`
   - `public.has_role(uuid, app_role)`
   - `public.get_user_zone_id(uuid)`
   - `public.has_dashboard_access(uuid, text)`
   
   Es seguro: son `SECURITY DEFINER`, de solo lectura, y solo responden sí/no sobre el usuario que se les pasa; sin ellas el modelo RLS entero no funciona.

2. **Robustez del login**: en `useAuth`, si la consulta de perfil devuelve error (no "sin fila"), no asumir "no aprobado" en silencio; mostrar un mensaje de error real en pantalla en lugar de mandar a /pending, para que un fallo de permisos no vuelva a disfrazarse de "cuenta pendiente".

3. **Registro de seguridad**: marcar los findings `SUPA_anon_security_definer_function_executable` / `SUPA_authenticated_security_definer_function_executable` como ignorados con la justificación (funciones requeridas por las políticas RLS) y actualizar la memoria de seguridad para que no se vuelvan a revocar.

## Verificación

Tras aplicar la migración, comprobar con el navegador que el admin entra al dashboard en lugar de a /pending.
