
## Plan: Mejoras en la pantalla de carga y gestion de usuarios

### 1. Pantalla de carga durante la transicion de login

Actualmente, al iniciar sesion, se muestra brevemente la pantalla de "Pendiente de aprobacion" antes de redirigir al Dashboard. Se reemplazara el texto simple "Cargando..." por un componente visual con spinner y mensaje, y se asegurara que aparezca mientras se resuelven los datos del usuario.

**Cambios:**
- Crear un componente `LoadingScreen` con spinner centrado y texto "Cargando datos..."
- Usarlo en `ProtectedRoute`, `PublicRoute` y `PendingRoute` en `App.tsx`

### 2. Reemplazar "Codigo de empleado" por "Vendedor"

El campo `employee_code` en la tabla `profiles` se renombrara conceptualmente a **Vendedor**. En lugar de ser un campo de texto libre, sera un desplegable que muestra los valores unicos de la columna `clientes.vendedor`.

Valores actuales en la base de datos:
- Alberto Sanchez, David Maestre, Encargado AL, Encargado GR, Encargado JAEN, Encargado MA, Encargado MZ, J. Antonio Bautista, Juan Diaz, M. Angeles Galvez, Manuel Hernandez, Manuel Villarejo, Rafael Cardenas

**Cambios en `AdminUsers.tsx`:**
- Renombrar la columna de la tabla de "Codigo" a "Vendedor"
- Reemplazar el campo editable de texto por un `Select` con las opciones unicas de `clientes.vendedor`
- Incluir opcion "Ninguno" para usuarios que no filtran (directores, gerentes)
- Al seleccionar un vendedor, se guardara en `profiles.employee_code`
- Se cargaran los vendedores unicos al montar el componente con una query `SELECT DISTINCT vendedor FROM clientes`

### 3. Reemplazar "Zona" por "Delegacion"

La columna "Zona" actualmente usa la tabla `zones`. Se cambiara para que use los valores unicos de `clientes.delegacion` en su lugar.

Valores actuales: ALMERIA, GRANADA, GUARROMAN, MALAGA, MANZANARES

**Cambios en `AdminUsers.tsx`:**
- Renombrar la columna de "Zona" a "Delegacion"
- Reemplazar el Select que lee de la tabla `zones` por uno que lee valores unicos de `clientes.delegacion`
- Incluir opcion "Ninguno" para limpiar la asignacion
- Al seleccionar, se guardara en `profiles.zone_id` (reutilizando el campo existente, pero almacenando el nombre de la delegacion como texto)

**Nota tecnica:** Como `zone_id` es de tipo `uuid` y las delegaciones son texto, se necesitara una migracion para agregar un campo `delegacion` (text) a `profiles`, o bien cambiar el tipo de `zone_id`. La opcion mas limpia es agregar una columna `delegacion` (text) a `profiles`.

### 4. Migracion de base de datos

Agregar columna `delegacion` de tipo `text` a la tabla `profiles` para almacenar la delegacion asignada (en lugar de usar `zone_id` con la tabla `zones`).

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delegacion text;
```

### Resumen de archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/LoadingScreen.tsx` | Nuevo componente de carga con spinner |
| `src/App.tsx` | Usar LoadingScreen en las rutas protegidas |
| `src/pages/AdminUsers.tsx` | Reemplazar Codigo por Vendedor (dropdown), Zona por Delegacion (dropdown), ambos con opcion "Ninguno" |
| Migracion SQL | Agregar columna `delegacion` a `profiles` |
