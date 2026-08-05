# FASE 3 — Plantillas definitivas de visita

Solo esta fase. Base de evidencia: los 1.311 comentarios reales del director ya repartidos en
`visita_bloques.nota_revision` (547 revisión de seguimiento, 412 promoción, 177 GSMart,
163 competencia, 6 potencial, 6 seguimiento).

## Qué exige el director, según sus propios comentarios

- **Estudio de competencia**: "SIN MARCA NO VALE", "FALTA REFERENCIA DEL COMPETIDOR",
  "NO SE PONE NUESTRO PRECIO", "FALTA PRECIO FALTA PONER VENTA FALLIDA". Marca, referencia
  y los dos precios son obligatorios para validar; también pide foto/albarán del competidor.
- **Revisión de seguimiento**: "SI NO TE ATIENDE NO ES REVISION DE SEGUIMIENTO", "NO VALE
  POR TELÉFONO", "QUE ESTAS REVISANDO ??". Hace falta el tema concreto, el interlocutor y
  que sea presencial.
- **Promoción / oferta**: "PON LA REFERENCIA", "CUAL ?? POR REFERENCIAS POR FAVOR",
  "MOTIVO NO VALIDO SI NO ESTAN EN SISTEMA LAS OFERTAS", "COMO SE LA ENVIAS ?? POR WASAP ??",
  "PON CANTIDAD Y A QUE PRECIO".
- **GSMart / crucero**: "HAY UN GUION, HAY QUE CEÑIRSE A ESE GUIÓN", "SABE DE PROMOCIONES ??",
  "AYUDALE A HACER UNA COMPRA". El contenido de viaje/crucero se separa a su propio motivo.
- **Información importante / potencial**: "SACA NÚMERO VEHÍCULOS / MARCA / NÚMERO MECÁNICOS /
  CUÁL ES EL MATERIAL (REFERENCIAS)".
- **Seguimiento**: "TIENES QUE COMENTAR QUE HABLAS CON EL CLIENTE", "QUÉ HAY QUE HACER DESPUÉS".

## 1. Esquema: lo que falta en `motivo_campos`

Migración de esquema (sin tocar `visita_bloques` ni sus triggers):

- `is_active boolean NOT NULL DEFAULT true`. Es la única forma real de retirar un campo:
  `sort_order` alto no lo oculta, se sigue pintando. Se filtra por `is_active` en los tres
  sitios: renderizador (`NuevaVisita`), diseñador (`AdminVisitas`, con conmutador para verlos)
  y esquema JSON que se envía a la IA (`visita-voz`).
- `visibilidad text NOT NULL DEFAULT 'normal'` con valores `normal` | `sistema`. Los `sistema`
  no se pintan ni se mandan a la IA, pero se persisten en `visita_bloques.campos` y se pueden
  rellenar por proceso.
- Nuevos tipos admitidos en `tipo`: `multiselect`, `referencia`, `adjunto`,
  `referencia_campana` (además de los actuales).
- Tabla nueva `catalogos_opciones (id, clave text, valor text, orden int, is_active bool,
  created_at, updated_at)` con índice único `(clave, valor)`, RLS: lectura para
  `authenticated`, escritura solo admin, más los GRANT correspondientes.

**Precedencia de opciones**: `motivo_campos.opciones` admite una lista literal `["A","B"]`
o una referencia `{"catalogo":"competidores"}`. Si es referencia, manda el catálogo y la
lista literal se ignora. Se resuelve en un helper compartido `src/lib/motivoCampos.ts`
(`resolverOpciones`, `camposVisibles`) usado por renderizador, diseñador y constructor del
esquema de IA. Catálogos iniciales: `competidores` (cierra el caso "L.M." / "LMR" /
"Luis Moleón"), `canales_envio`, `marcas_vehiculo`, `tipo_ejes`, `temas_gsmart`.

## 2. Motivos y campos definitivos

Reseed de datos: primero `is_active = false` en **todos** los campos de los motivos que se
redefinen, después upsert por `(motivo_key, campo_key)` reactivando solo los vigentes. Ningún
campo se borra, así los 21.484 bloques históricos conservan sus valores.

Motivos existentes (7), con textos de `ayuda` redactados a partir de los comentarios reales,
`placeholder` con ejemplos del histórico y `requerido_validacion` marcado donde el director
lo exige (distinto de `is_required`, que es lo mínimo para guardar):

- **competencia**: `competidor` (select → catálogo `competidores`), `marca_competencia`,
  `referencia_competencia` (tipo `referencia`), `precio_rimosa`, `precio_competencia`,
  `resultado_venta` (ganada / fallida / pendiente), `foto_albaran` (tipo `adjunto`),
  `conclusion`. Validación: marca + referencia + ambos precios + resultado.
- **promocion**: `referencia` (tipo `referencia`), `producto`, `cantidad`, `precio_ofertado`,
  `canal_envio` (catálogo), `respuesta_cliente`, `importe_estimado`, `proxima_accion`.
  Sistema: `fuera_de_plazo` (booleano) y `motivo_fuera_plazo` (texto), que la fase 5 usará.
  Declarado pero apagado: `campana_id`, tipo `referencia_campana`, `is_active = false`.
- **revision_seguimiento**: `tema_revisado`, `oferta_revisada`, `interlocutor`,
  `canal` (presencial / teléfono / WhatsApp), `referencia`, `resultado`, `motivo_perdida`,
  `importe`, `proxima_accion`. Validación: tema + interlocutor + canal presencial.
- **gsmart** (solo plataforma): `tema` (catálogo), `conoce_promociones`, `sabe_comprar`,
  `compra_realizada`, `incidencias`, `formacion`, `proxima_accion`.
  `accesos` e `importe_pedidos` pasan a `visibilidad = 'sistema'`: vienen del ERP, el
  comercial no los teclea.
- **informacion_potencial**: contacto, nº vehículos, marcas (multiselect + catálogo),
  tipo de ejes (multiselect), nº mecánicos, tipo de trabajo, referencias de consumo
  (`referencia`), potencial estimado.
- **seguimiento** e **incidencia**: ajustes de obligatoriedad, orden y ayudas.

Motivos nuevos (4): `viaje_incentivo` (contenido de crucero/viaje separado de GSMart, con
interés, acompañantes, importe objetivo), `gestion_cobro` (importe pendiente, antigüedad,
compromiso de pago, fecha), `alta_reapertura` (origen del alta, datos fiscales, potencial,
primer pedido) y `visita_partner` (partner, motivo conjunto, acuerdos). Cada uno con su
descripción de criterio de validez en `motivos_visita.descripcion`.

## 3. Frontend

- `src/lib/motivoCampos.ts`: helper compartido (filtrado por `is_active` y `visibilidad`,
  resolución de opciones con la regla de precedencia).
- `NuevaVisita.tsx`: renderiza los tipos nuevos — `multiselect` (chips), `referencia`
  (autocompletado contra `productos` vía RPC con índice trigram, rellena descripción, familia
  y marca), `adjunto` (subida a un bucket de Storage `visitas`). Muestra la `ayuda` bajo cada
  campo y avisa, sin bloquear el guardado, cuando falta un campo con `requerido_validacion`.
- `AdminVisitas.tsx`: editar `placeholder`, `requerido_validacion`, `is_active`, `visibilidad`,
  tipos nuevos y elegir catálogo en lugar de lista literal; conmutador "ver campos retirados";
  descripción del motivo como textarea.
- `supabase/functions/visita-voz`: el esquema JSON excluye campos inactivos y de sistema, y
  usa las opciones resueltas del catálogo para los `select` / `multiselect`.

## Detalle técnico

- Una migración de esquema (columnas nuevas + `catalogos_opciones` + bucket + RPC de búsqueda
  de productos `buscar_productos(_q text)` security definer con GRANT a `authenticated`),
  y después una operación de datos para el reseed de motivos, campos y catálogos.
- Sin cambios en `visita_bloques`, `recalcular_validacion_visita()` ni en el reparto de FASE 6a.

No se avanza a ninguna otra fase.
