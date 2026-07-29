## Qué dice el fichero (21.581 visitas, 03/2025 – 12/2026)

| Campo | Contenido | Uso |
|---|---|---|
| Fecha / Hora | separados | se unen en fecha + hora |
| Código cliente | `04-10374` (21.088) y `NV-xxx` (461 = clientes nuevos/prospectos) | el número tras el guion enlaza con `cod_cliente` |
| Motivo | 6 valores + 452 vacíos | base de las plantillas |
| Tipo | Ruta (9.013), Cliente (8.139), Llamada (4.346), Agenda (83) | canal de la visita |
| Estado | Realizada (17.965), Pendiente (3.591), Cancelada (25) | ya coincide con nuestro modelo |
| Observaciones | 84% rellenas, media 130 caracteres | texto libre a explotar con IA |
| Comercial | 7 comerciales, formato `23 - Nombre` | el número es el código de vendedor |
| Ruta / Zona / Lat / Lon | parciales (63% con GPS) | mapa y filtros |
| Título / Clase | prácticamente vacíos | se descartan |

Hallazgo clave: casi todas las observaciones empiezan por **CORRECTO / NO CORRECTO**: es una marca de validación del jefe de zona, no parte del comentario. Se extrae a un campo propio y se limpia del texto.

Segundo hallazgo: dentro de cada motivo el texto sigue un patrón repetido (referencia, precio Rimosa, precio competencia, respuesta del cliente…). Eso es exactamente lo que deben ser los campos de la plantilla, y lo que la IA rellenará desde la nota de voz.

## Plantillas propuestas (revisables y editables después desde Administración)

1. **Seguimiento** — situación del cliente / necesidades detectadas / acuerdos / próxima acción / fecha próxima acción
2. **Promoción, oferta o campaña** — producto ofertado / referencia / precio ofertado / respuesta del cliente (interesado, lo piensa, rechaza) / importe estimado / próxima acción
3. **Revisión de seguimiento** — oferta que se revisa / referencia / resultado (pedido, pendiente, perdida) / motivo si se pierde / importe / próxima acción
4. **Estudio de competencia** — competidor / referencia / nuestro precio / precio competencia / marca que compra / conclusión y acción
5. **GSMart / Viaje crucero** — tema (GSMart, crucero, ambos) / entradas del mes / importe pedido por GSMart / incidencias detectadas / formación dada / próxima acción
6. **Información importante / potencial** — persona de contacto / nº vehículos / marcas de vehículo / tipo de ejes / nº mecánicos / tipo de trabajo / potencial estimado / observaciones
7. **Incidencia** (se mantiene la actual) — descripción / impacto / solución

Campos comunes a todos: cliente, fecha, hora, tipo (ruta/cliente/llamada/agenda), estado, observación libre, validación, GPS opcional.

## Ejecución

**1. Base de datos**
- Ampliar `visitas`: `hora`, `tipo`, `validacion` (correcto / no correcto / sin marcar), `latitud`, `longitud`, `ruta`, `zona`, `comercial_nombre`, `titulo`, `cliente_externo` (para los `NV-`), y `origen` admite `gespromo`.
- Ampliar `motivo_campos`: `tipo` acepta `select`, `fecha`, `booleano`; nuevos `opciones` (jsonb) y `placeholder`.
- Sustituir los 4 motivos actuales por los 7 propuestos con sus campos, mapeando los nombres de Gespromo.
- RPC de carga masiva `importar_visitas_historicas` (solo admin), con deduplicado por cliente+fecha+hora+comercial para poder repetir la carga sin duplicar.

**2. Carga del histórico**
- Nuevo módulo en Gestión de Datos: **Visitas (histórico Gespromo)**, que lee este mismo formato de Excel, normaliza el código de cliente, extrae CORRECTO/NO CORRECTO, mapea motivos y comerciales, y avisa de los clientes que no existen en el maestro.
- (Opcional, segunda pasada) proceso de IA que relee las observaciones históricas y rellena los campos de plantilla retroactivamente, para que el histórico sea explotable como datos y no solo como texto.

**3. Administración → Plantillas de visita**
Pantalla nueva: lista de motivos (crear, renombrar, color, orden, activar/desactivar) y, dentro de cada uno, sus campos (etiqueta, ayuda, tipo, obligatorio, opciones de lista, orden) con arrastrar para reordenar. Todo lo que se cambie ahí afecta al formulario del comercial y al prompt de la IA sin tocar código.

**4. Panel de Visitas**
- KPIs: visitas del periodo, realizadas vs pendientes, % validadas, media por comercial.
- Gráficos: evolución mensual, reparto por motivo, ranking por comercial, cobertura de clientes visitados.
- Listado filtrable (comercial, motivo, tipo, estado, fechas, ruta) con ficha de detalle y acceso al cliente.
- En la ficha 360 del cliente, las visitas pasan a mostrar los campos de plantilla además del texto.

**5. Formulario del comercial**
El formulario de nueva visita y el prompt de la nota de voz se generan desde las plantillas ya editables, incluidos los campos de lista.

### Detalle técnico
`Código cliente` se normaliza con `split('-')[1]::int`; los `NV-` se guardan sin `cod_cliente` y con el nombre en `cliente_externo`. El comercial se enlaza por el número previo al guion contra `profiles.employee_code`, con el nombre original guardado como respaldo. La carga se hace en bloques de 500 filas vía RPC `SECURITY DEFINER` reutilizando el patrón del maestro ISI.

### Orden de trabajo
Migración → módulo de carga y importación del histórico → administración de plantillas → panel de visitas → formulario y voz.
