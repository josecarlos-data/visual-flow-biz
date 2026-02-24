

# Dashboard Comercial - Plan de Implementación (MVP)

## Visión General
Aplicación tipo Power BI con dashboard de ventas, control de accesos por roles jerárquicos y panel de administración para gestión de usuarios y carga de datos.

---

## 🔐 1. Autenticación y Roles

### Sistema de Login
- Página de inicio de sesión con email y contraseña
- Los nuevos usuarios se registran pero **no pueden acceder** hasta que el Admin apruebe su cuenta

### Jerarquía de Roles (4 niveles)
| Rol | Acceso a datos |
|-----|---------------|
| **Admin** | Todo + Panel de administración |
| **Director Comercial** | Ve ventas de todas las zonas |
| **Jefe de Zona** | Ve ventas de los comerciales de su zona |
| **Comercial** | Solo ve sus propias ventas |

### Base de datos
- Tabla de perfiles de usuario (nombre, zona/delegación asignada)
- Tabla de roles separada (seguridad contra escalación de privilegios)
- Tabla de zonas/delegaciones
- Políticas RLS para aislar datos según rol y zona

---

## 📊 2. Dashboard de Ventas

### Vista principal (para todos los roles)
- Panel con KPIs principales (ventas totales, objetivos, etc.)
- Gráficos de evolución de ventas
- Tabla resumen de datos
- Los datos mostrados se filtran automáticamente según el rol del usuario:
  - Comercial → solo sus datos
  - Jefe de zona → datos de su zona
  - Director → todos los datos

---

## ⚙️ 3. Panel de Administración (solo Admin)

### 3a. Gestión de Usuarios
- Lista de usuarios pendientes de aprobación
- Aprobar o rechazar nuevos registros
- Asignar rol a cada usuario (Director, Jefe de Zona, Comercial)
- Asignar zona/delegación
- Editar permisos de usuarios existentes

### 3b. Gestión de Datos (Carga de tablas)
- Vista con tarjetas/slicers que representan cada tabla de datos disponible
- Al hacer clic en una tabla, aparecen 3 opciones:
  - **📤 Actualizar datos**: Subir archivo XLS o CSV para reemplazar/actualizar la tabla
  - **📥 Exportar datos**: Descargar la tabla actual en CSV/XLS
  - **👁️ Previsualizar**: Mostrar las 10 primeras filas con encabezados

---

## 🎨 4. Diseño y Navegación

- Estilo **moderno y minimalista** con tema claro
- Sidebar de navegación con las secciones según el rol
- Diseño responsive (funcional en móvil y escritorio)
- Colores corporativos neutros con acentos para KPIs

---

## 🚀 Fases del MVP

**Fase 1** - Fundamentos:
- Configurar Supabase (auth, tablas, RLS)
- Login y registro con aprobación
- Sistema de roles y permisos

**Fase 2** - Admin:
- Panel de gestión de usuarios
- Carga y previsualización de datos (CSV/XLS)

**Fase 3** - Dashboard:
- Dashboard con gráficos y KPIs básicos
- Filtrado automático por rol/zona

> **Nota**: La estructura exacta de la base de datos de ventas se definirá cuando subas el archivo con la estructura. Por ahora se creará la arquitectura base de roles, usuarios y zonas.

