
# Mejoras en Admin y Dashboard del Director Comercial

## Resumen
Dos cambios principales:
1. **Panel de Admin**: Ampliar la tabla de usuarios para mostrar email, permitir editar nombre y asignar un "codigo de comercial" (numero identificador para vincular con datos de ventas).
2. **Dashboard Director Comercial**: Filtro multi-seleccion de comerciales para comparar datos entre ellos.

---

## 1. Base de datos: nuevo campo `employee_code` en `profiles`

Migración SQL para añadir una columna `employee_code` (texto, nullable, unico) a la tabla `profiles`. Este codigo es el que vinculara al usuario con sus filas en las tablas de ventas que se carguen posteriormente.

```text
profiles
  + employee_code TEXT UNIQUE (nullable)
```

No se necesitan cambios de RLS: las politicas existentes ya cubren SELECT y UPDATE sobre `profiles` para admins.

---

## 2. Panel de Admin (`AdminUsers.tsx`) - Mejoras

### Datos mostrados por usuario
- **Email**: se obtendra consultando `auth.users` a traves de una funcion `security definer` (ya que no se puede consultar `auth.users` directamente desde el cliente). Alternativa mas simple: almacenar el email en `profiles` mediante el trigger `handle_new_user` que ya existe.
  - **Enfoque elegido**: Modificar el trigger `handle_new_user` para guardar tambien el email en profiles (nuevo campo `email`). Esto evita funciones extra y es mas eficiente.

- **Nombre**: editable inline con un boton de edicion que abre un dialogo o input inline.
- **Codigo de comercial**: input editable para asignar/cambiar el numero identificador.
- **Rol y Zona**: ya existen, se mantienen.

### Tabla de usuarios pendientes
Tambien mostrara el email para identificar mejor a cada usuario.

### Tabla de usuarios aprobados - Columnas finales
| Nombre (editable) | Email | Codigo | Rol | Zona |

### Flujo de edicion
- Click en nombre o codigo -> input inline o dialogo modal para editar.
- Guardar llama a `supabase.from("profiles").update(...)`.

---

## 3. Migracion de base de datos

```sql
-- Añadir email y employee_code a profiles
ALTER TABLE public.profiles ADD COLUMN email TEXT;
ALTER TABLE public.profiles ADD COLUMN employee_code TEXT UNIQUE;

-- Actualizar trigger para guardar email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;
```

---

## 4. Dashboard Director Comercial

### Filtro de comerciales
- Componente multi-select que lista todos los comerciales (nombre + codigo).
- Para roles `director_comercial` y `admin`: pueden seleccionar uno o varios comerciales.
- Al seleccionar multiples, los KPIs y graficos muestran datos comparativos lado a lado.
- Cuando no hay datos de ventas aun, el filtro aparecera pero mostrara un mensaje indicando que no hay datos.

### Implementacion
- Nuevo componente `ComercialFilter` con checkboxes/multi-select.
- El Dashboard recibe los IDs seleccionados y filtra las queries.
- Como aun no hay tablas de ventas, se preparara la UI del filtro y la logica de seleccion, lista para conectarse cuando se carguen datos.

---

## 5. Archivos a crear/modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Añadir `email` y `employee_code` a `profiles`, actualizar trigger |
| `src/pages/AdminUsers.tsx` | Añadir columnas email, codigo; edicion inline de nombre y codigo |
| `src/pages/Dashboard.tsx` | Añadir filtro multi-select de comerciales para director/admin |
| `src/components/ComercialFilter.tsx` | Nuevo componente de filtro multi-seleccion |

---

## Seccion tecnica

- El campo `employee_code` es `TEXT` y no `INTEGER` para flexibilidad (codigos con prefijos, ceros a la izquierda, etc.).
- La constraint `UNIQUE` en `employee_code` previene duplicados.
- El email se copia a `profiles` en el trigger para evitar queries a `auth.users` (schema protegido).
- El filtro multi-select del director usara un estado local con array de `user_id` seleccionados, que se pasara como parametro a las futuras queries de ventas.
