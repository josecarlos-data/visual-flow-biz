
Objetivo inmediato: corregir el bloqueo en “Cuenta pendiente de aprobación” para que:
1) un usuario aprobado (incluido Admin) entre al dashboard correctamente, y  
2) el botón “Cerrar sesión” saque siempre a la pantalla de login.

Diagnóstico confirmado
- El backend ya tiene tu usuario `josecarlossobrino.analista@gmail.com` con `is_approved = true` y rol `admin`.
- El problema principal está en frontend, en el flujo de auth/rutas:
  - En `useAuth`, `isLoading` pasa a `false` antes de terminar `fetchUserData`.
  - Durante ese intervalo, `isApproved` sigue en `false` por defecto y `/` redirige a `/pending`.
  - La ruta `/pending` no tiene guardia para “usuario ya aprobado”, así que te quedas ahí aunque luego llegue `isApproved=true`.
  - El botón “Cerrar sesión” sí puede cerrar sesión, pero como sigues en `/pending`, parece que “no hace nada”.

Alcance de implementación (sin cambios de base de datos)
- No se requieren migraciones ni cambios de RLS.
- Solo ajustes en lógica de estado/routing en:
  - `src/hooks/useAuth.tsx`
  - `src/App.tsx`
  - `src/pages/PendingApproval.tsx`

Plan de cambios
1) Robustecer inicialización de auth (`useAuth.tsx`)
- Hacer que el estado de carga cubra también la lectura de perfil/rol.
- Eliminar la carrera causada por `setTimeout(() => fetchUserData(...), 0)` + `setIsLoading(false)` prematuro.
- Secuencia:
  - Si hay sesión: esperar `fetchUserData` y después `setIsLoading(false)`.
  - Si no hay sesión: limpiar estado y luego `setIsLoading(false)`.
- Mantener roles en `user_roles` (tabla separada), sin mover roles a `profiles`.

2) Proteger correctamente la ruta `/pending` (`App.tsx`)
- Crear un `PendingRoute` (o lógica equivalente) con reglas:
  - `isLoading` => pantalla de carga.
  - `!user` => redirigir a `/auth`.
  - `user && isApproved` => redirigir a `/`.
  - `user && !isApproved` => renderizar `PendingApproval`.
- Con esto, un admin aprobado nunca quedará “atrapado” en `/pending`.

3) Hacer explícita la salida desde pendiente (`PendingApproval.tsx`)
- En el click de “Cerrar sesión”:
  - Ejecutar `await signOut()`.
  - Navegar a `/auth` con `replace`.
- Añadir estado local de “cerrando sesión…” para evitar doble clic y mejorar UX.

Validación end-to-end que ejecutaré después
- Caso A (usuario pendiente): login -> `/pending`; “Cerrar sesión” -> `/auth`.
- Caso B (tu usuario admin aprobado): login -> entra directo a `/` (dashboard), sin pasar por bloqueo en `/pending`.
- Caso C (recarga de página en sesión aprobada): permanece en dashboard.
- Caso D (abrir `/pending` manualmente siendo aprobado): redirige a `/`.

Riesgos y mitigación
- Riesgo: parpadeo de rutas al iniciar sesión.
  - Mitigación: no desactivar `isLoading` hasta terminar perfil+rol.
- Riesgo: inconsistencias por sesiones previas en navegador.
  - Mitigación: limpiar estado de auth en signOut y navegación explícita a `/auth`.
