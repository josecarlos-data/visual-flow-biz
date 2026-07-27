## Recomendación: seguimos aquí, no empezamos de cero

La app ya tiene lo más caro y delicado de un CRM: autenticación, aprobación manual de usuarios, roles (admin / director / jefe de zona / comercial), aislamiento de datos por RLS, permisos por dashboard, carga modular de Excel y acceso a IA sin claves. Tirar eso para empezar otra app sería repetir semanas de trabajo. Lo que añadimos ahora son tablas y pantallas nuevas encima de esa base.

El "giro de 90 grados" es de producto, no de tecnología: pasamos de *panel de consulta* a *herramienta de trabajo diaria del comercial*.

---

## Sobre OneDrive y tu duda de privacidad

Respuesta honesta: el conector de OneDrive pide permiso de lectura sobre tus archivos, no sobre "un archivo concreto". Microsoft no permite acotar el consentimiento a un solo fichero. La app solo leería el archivo que le indiques, pero el permiso concedido es más amplio.

Opciones, y mi recomendación:

1. **Enlace compartido del archivo** (recomendado para el prototipo). Compartes el .xlsx con enlace de solo lectura y la app lo descarga por esa URL. Cero permisos sobre tu cuenta, y se puede refrescar automáticamente cada día.
2. **Cuenta de OneDrive de servicio**: creas una cuenta corporativa que solo contenga la carpeta del CRM y conectas esa. Permiso amplio, pero sobre una cuenta que no tiene nada más.
3. Conector completo sobre tu cuenta personal — no lo aconsejo ahora.

Plan: empezamos con la opción 1, y dejamos el botón de "sincronizar ahora" + sincronización diaria automática. Si más adelante hace falta escribir en el Excel, pasamos a la opción 2.

---

## Estructura del Excel (4 hojas)

| Hoja | Uso en la app |
|---|---|
| `Ventas` | Histórico mensual (ya existe la lógica) |
| `Clientes` | Ficha, ruta asignada, delegación, comercial |
| `Productos` | Catálogo y qué compra/no compra cada cliente |
| `Visitas` | Histórico exportado de Gespromo (motivo + observación libre) |

Cada hoja se lee con su propio módulo de dataset, igual que hoy con Ventas. Si añades columnas, se ajusta un módulo y ya.

---

## Fase 1 — lo que se construye

### 1. Ficha 360 del cliente
Una pantalla por cliente con: datos maestros, evolución de ventas por año/mes, productos que compra y **productos que no compra pero sí compran clientes similares**, últimas visitas registradas y el resumen IA del cliente. Es la pantalla que el comercial abre en el coche antes de entrar.

### 2. Rutas y agenda
- Cada cliente trae su **ruta asignada** desde el Excel (la de Gespromo).
- El comercial construye su **planificación propia**: elige día, añade clientes de su cartera (por ruta, por zona, o buscando), reordena y marca visitado / no visitado / aplazado.
- Vista de hoy, vista de semana, y un contador de "clientes sin visitar hace más de X días" para que nadie se quede olvidado.
- El jefe de zona ve la planificación de su equipo; el comercial solo la suya.

### 3. Registro de visitas por voz (el núcleo)
Flujo en el móvil:

```text
1. Comercial abre el cliente → "Nueva visita"
2. Elige MOTIVO (seguimiento / oferta / análisis competencia / …)
3. La pantalla muestra los PUNTOS OBLIGATORIOS de ese motivo
4. Pulsa el micro y habla libremente
5. IA transcribe y reparte la información en cada punto
6. El comercial revisa: edita a mano, o vuelve a dictar y se regenera
7. Guardar → bloqueado si falta algún campo obligatorio
```

Los motivos y sus campos obligatorios **son configurables desde administración**, no van escritos en el código: cuando el jefe de cuentas cambie los criterios, se editan en pantalla.

El audio no se almacena (según tu elección); se guarda la transcripción y los campos estructurados. Y esto es la gran mejora sobre Gespromo: donde antes había un texto plano inanalizable, ahora hay campos estructurados **y** el texto original.

### 4. Insights IA por cliente
Generados a demanda desde la ficha: caída o subida de ventas frente al año anterior, productos con recorrido, resumen de lo hablado en las últimas visitas, y 2-3 sugerencias concretas de argumentario para la próxima visita. Todo con IA integrada, sin claves de terceros.

### 5. Móvil
La app pasa a ser **instalable en el teléfono** desde el navegador (icono en la pantalla de inicio, pantalla completa) y se rediseñan las pantallas de visita, agenda y ficha para uso a una mano. En ordenador sigue funcionando igual. Si más adelante quieres estar en App Store / Google Play, se puede empaquetar sin rehacer nada.

---

## Permisos

Se apoya en lo ya hecho: nuevos dashboards `crm-visitas` y `crm-agenda` asignables por usuario. El comercial ve y edita solo sus clientes y sus visitas; el jefe de zona, los de su zona; dirección y admin, todo.

---

## Detalles técnicos

- **Nuevas tablas**: `productos`, `cliente_productos`, `rutas`, `visitas_planificadas`, `visitas` (motivo, campos estructurados en JSON, transcripción, estado), `motivos_visita` + `motivo_campos` (configuración de formularios), `cliente_insights` (caché de análisis IA).
- Todas con RLS por comercial / zona / admin usando las funciones auxiliares ya existentes (`is_admin`, `get_user_zone_id`, `get_user_employee_code`) y GRANT explícitos.
- **Transcripción**: `openai/gpt-4o-transcribe` vía la pasarela de IA, en función de servidor. Grabación en el navegador en WAV para que funcione igual en iPhone y Android.
- **Extracción de campos**: modelo de chat con salida estructurada según el esquema del motivo elegido.
- **Ingesta OneDrive**: función programada diaria que descarga el .xlsx del enlace compartido, lo parsea con los módulos de dataset existentes y hace clean-and-upsert por hoja. Botón manual de "Sincronizar ahora" en administración con registro de la última sincronización.
- **Instalable**: manifiesto e iconos, sin modo offline por ahora.

---

## Orden de entrega propuesto

1. Ingesta OneDrive + tablas de productos/clientes/visitas históricas
2. Ficha 360 del cliente
3. Registro de visitas por voz + configuración de motivos
4. Agenda y rutas
5. Insights IA + ajuste móvil e instalación

---

## Fuera de alcance ahora

La integración directa con el ERP Easy / Isiparts queda para la siguiente fase. El diseño de las tablas se hace pensando en ella: cuando llegue, se sustituye la ingesta de Excel por la del ERP sin tocar las pantallas.
