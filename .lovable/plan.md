## Plan: Permisos granulares por Dashboard

### Objetivo

Permitir que el administrador asigne a cada usuario qué dashboards puede ver. Inicialmente: **Ventas** (existente) y **Compras** (nuevo, ficticio para pulir). El sistema queda preparado para añadir más (Fichaje, etc.) sin tocar la lógica de permisos, solo registrando el nuevo módulo.

Importante: esto es ortogonal al **rol** (admin / director / jefe de zona / comercial). El rol seguirá controlando *qué datos* ve dentro de un dashboard (filtrado por delegación/vendedor). El nuevo permiso controla *a qué dashboards* tiene acceso.

Regla por defecto:
- **Admin**: acceso a todos los dashboards siempre (implícito, no se gestiona).
- **Resto de usuarios**: sin acceso por defecto; el admin marca explícitamente qué dashboards puede ver cada uno.

---

### Cambios en base de datos

Nueva tabla `user_dashboard_access` y catálogo de dashboards:

```text
dashboards (catálogo)
├─ key (text, PK)        ej. "ventas", "compras", "fichaje"
├─ name (text)           ej. "Ventas", "Compras"
├─ description (text)
├─ icon (text)           nombre del icono lucide
├─ route (text)          ej. "/", "/compras"
├─ sort_order (int)
└─ is_active (bool)

user_dashboard_access
├─ id (uuid, PK)
├─ user_id (uuid → auth.users)
├─ dashboard_key (text → dashboards.key)
└─ UNIQUE(user_id, dashboard_key)
```

Seed inicial del catálogo:
- `ventas` → "Ventas", ruta `/`
- `compras` → "Compras", ruta `/compras`

**Función helper** (security definer) para evitar recursión en RLS y simplificar checks en el frontend:

```sql
has_dashboard_access(_user_id uuid, _dashboard_key text) returns boolean
-- true si is_admin OR existe fila en user_dashboard_access
```

**RLS**:
- `dashboards`: SELECT permitido a usuarios aprobados; ALL a admins.
- `user_dashboard_access`: SELECT propio + admins ven todo; INSERT/UPDATE/DELETE solo admins.

---

### Cambios en frontend

**1. Hook `useAuth`** — añadir `dashboards: string[]` (lista de keys a las que el usuario tiene acceso) cargado junto al perfil. Para admins, devolver todas las keys activas.

**2. `AppSidebar`** — sustituir `mainItems` hardcodeado por una lista dinámica construida desde el catálogo `dashboards` filtrado por `dashboards` del usuario. Cada entrada renderiza icono + nombre + link a `route`.

**3. `App.tsx` / `ProtectedRoute`** — añadir prop `dashboardKey?: string`. Si está presente y el usuario no la tiene en su lista, redirigir a `/`. Mantener `adminOnly` como hasta ahora.

**4. Nueva página `src/pages/Compras.tsx`** — placeholder ficticio: header "Compras", tarjetas con KPIs inventados (total compras mes, nº proveedores, etc.) y un gráfico de ejemplo. Sirve para validar el sistema de permisos.

**5. Nueva ruta** `/compras` en `App.tsx`:
```tsx
<Route path="/compras" element={
  <ProtectedRoute dashboardKey="compras"><Compras /></ProtectedRoute>
} />
```
La ruta `/` (Dashboard ventas) pasa a usar `dashboardKey="ventas"`.

**6. AdminUsers** — nueva columna **"Dashboards"** en la tabla de usuarios aprobados con un control multi-selección (checkboxes o badges togglables) que muestra todos los dashboards del catálogo y permite marcar/desmarcar cada uno. Cambios se persisten en `user_dashboard_access` (insert/delete según toggle). Para admins, mostrar badges deshabilitados con todos marcados ("acceso total").

---

### Flujo final de uso

1. Admin entra en `/admin/users`.
2. Para cada usuario aprobado ve checkboxes: ☐ Ventas ☐ Compras.
3. Marca los que correspondan; al recargar el usuario, su sidebar solo muestra esos dashboards y solo puede acceder a esas rutas.
4. Cuando se cree un nuevo dashboard (ej. Fichaje), basta con: insertar fila en `dashboards`, crear página + ruta, y aparecerá automáticamente como opción asignable en AdminUsers.

---

### Archivos afectados

| Archivo | Cambio |
|---|---|
| migración SQL | Crear `dashboards`, `user_dashboard_access`, `has_dashboard_access`, RLS, seed |
| `src/hooks/useAuth.tsx` | Cargar y exponer `dashboards: string[]` |
| `src/App.tsx` | `ProtectedRoute` con `dashboardKey`, ruta `/compras`, marcar `/` con `dashboardKey="ventas"` |
| `src/components/AppSidebar.tsx` | Items dinámicos desde catálogo + permisos |
| `src/pages/Compras.tsx` | Nueva página placeholder |
| `src/pages/AdminUsers.tsx` | Nueva columna "Dashboards" con asignación multi |
