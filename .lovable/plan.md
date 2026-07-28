## Lo que hay en el fichero

- **Hechos_Diarios**: 402.527 líneas diarias (02/01/2024 → 24/07/2026) con cliente, referencia, marca, familia, fecha, unidades, **importe y margen**. Incluye abonos (negativos).
- **Dim_Cliente**: 11.588 clientes (solo 3.419 con ventas), con vendedor y código de vendedor.
- **Dim_Referencia**: 68.401 referencias, 357 marcas, 168 familias (8.908 sin descripción).
- **TopTruck**: 13 clientes marcados.
- Falta la delegación (la añadirás al origen), y no hay localidad, teléfono ni ruta.

## Plan

### 1. Nuevo modelo de datos
- `ventas_diarias`: detalle línea a línea (cliente, referencia, marca, familia, fecha, unidades, importe, margen).
- `productos`: ampliada con marca y familia_marca desde Dim_Referencia.
- `clientes`: se alimenta de Dim_Cliente (razón social, vendedor, código de vendedor, Top Truck). El CIF **no se carga** — no aporta nada al análisis y evita el debate de protección de datos.
- Tablas resumen recalculadas en la propia base de datos tras cada carga:
  - resumen mes × cliente (importe, margen, unidades),
  - resumen año × cliente × familia y × marca,
  - ficha rápida por cliente (última compra, días sin comprar, nº de referencias, margen %).
- La `delegacion` queda preparada: en cuanto añadas la columna al Excel se rellena sola; mientras tanto la seguridad por rol funciona por vendedor.

### 2. Carga de los datos reales (ahora)
- Se sube el maestro a un almacén privado de la aplicación y una función de servidor lo procesa por bloques (el volumen es demasiado grande para el navegador).
- Pantalla "Gestión de datos" rehecha: subir maestro, ver progreso, filas cargadas por hoja, errores y fecha de la última carga.
- Cuando haya acceso a OneDrive, esa misma función leerá el fichero directamente sin cambiar nada más.

### 3. Permiso de margen configurable
- Nuevo permiso por usuario, gestionado desde Administración → Usuarios, igual que los dashboards.
- Sin permiso, la aplicación no muestra margen en ningún panel, ficha, gráfico ni respuesta de la IA (bloqueado también en el servidor, no solo en pantalla).

### 4. Panel de ventas rediseñado
- KPIs: facturación, margen € y %, unidades, nº de clientes activos, ticket medio — con comparativa contra el mismo periodo del año anterior.
- Evolución mensual con margen superpuesto y selector de año.
- Rankings: top clientes por facturación y por margen, top familias y top marcas.
- **Cuadro de alertas**, lo más valioso de estos datos:
  - clientes que caen respecto al año anterior,
  - clientes con muchos días sin comprar (fuga),
  - clientes de alta facturación y margen bajo,
  - familias que un cliente ha dejado de comprar,
  - cartera dormida: los ~8.000 clientes sin ventas, filtrados por vendedor.

### 5. Ficha de cliente 360 ampliada
- Recencia y frecuencia de compra, evolución mensual, mix por familia y marca, referencias top y referencias abandonadas, margen (si tiene permiso), histórico de visitas.

### 6. Asistente IA
- Icono flotante en toda la app; en la ficha de un cliente responde sobre ese cliente, y en el panel sobre la cartera visible.
- Respeta rol, vendedor, delegación y el permiso de margen.

### 7. Accesos por perfil
- Comerciales: Ventas, Clientes, Agenda y Visitas. Compras se queda solo para administración.

## Detalles técnicos

- Ingesta con edge function + almacenamiento privado, lectura por streaming en bloques de 2.000 filas y `upsert` idempotente; los resúmenes se recalculan con SQL al terminar.
- Índices por `cod_cliente`, `fecha`, `familia` y `marca`; los paneles leen de las tablas resumen, nunca del detalle completo.
- RLS sobre `ventas_diarias` y resúmenes reutilizando `is_admin` / vendedor / delegación ya existentes.

## Orden de trabajo

1. Estructura de datos + permiso de margen.
2. Carga del maestro real y verificación de cifras (14,6 M€ 2024 / 15,0 M€ 2025 / 7,9 M€ 2026).
3. Panel de ventas y alertas.
4. Ficha de cliente y asistente IA.
