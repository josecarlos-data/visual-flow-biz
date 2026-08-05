# FASE 3 — Plantillas definitivas de visita

Solo esta fase. Base de evidencia: los 1.311 comentarios reales del director ya repartidos en
`visita_bloques.nota_revision` (547 revisión de seguimiento, 412 promoción, 177 GSMart,
163 competencia, 6 potencial, 6 seguimiento). De su lectura salen los criterios de "visita
válida" que se van a codificar en las plantillas.

## Qué exige el director, según sus propios comentarios

- **Estudio de competencia**: "SIN MARCA NO VALE", "FALTA REFERENCIA DEL COMPETIDOR",
  "NO SE PONE NUESTRO PRECIO", "FALTA PRECIO FALTA PONER VENTA FALLIDA". Marca, referencia
  y los dos precios son obligatorios para validar.
- **Revisión de seguimiento**: "SI NO TE ATIENDE NO ES REVISION DE SEGUIMIENTO", "NO VALE
  POR TELÉFONO", "QUE ESTAS REVISANDO ??", "TIENES QUE TRATAR EL TEMA CONCRETO CON EL
  CLIENTE". Hace falta decir qué oferta/tema se revisa, con quién se habló y que fue presencial.
- **Promoción / oferta**: "PON LA REFERENCIA", "CUAL ?? POR REFERENCIAS POR FAVOR",
  "MOTIVO NO VALIDO SI NO ESTAN EN SISTEMA LAS OFERTAS", "COMO SE LA ENVIAS ?? POR WASAP ??",
  "PON CANTIDAD Y A QUE PRECIO". Referencia, precio, cantidad y canal de envío de la oferta.
- **GSMart / crucero**: "HAY UN GUION, HAY QUE CEÑIRSE A ESE GUIÓN", "SABES CUANTOS ACCESOS
  TIENEN ??", "SABE DE PROMOCIONES ??", "AYUDALE A HACER UNA COMPRA". El guion se convierte
  en campos concretos.
- **Información importante / potencial**: "SACA NÚMERO VEHÍCULOS / MARCA / NÚMERO MECÁNICOS /
  CUÁL ES EL MATERIAL (REFERENCIAS)".
- **Seguimiento**: "TIENES QUE COMENTAR QUE HABLAS CON EL CLIENTE", "HACER SEGUIMIENTO",
  "QUÉ HAY QUE HACER DESPUÉS".

## Cambios que se van a hacer

1. **Reescribir el catálogo de campos** de los 7 motivos existentes (migración de datos sobre
   `motivos_visita` y `motivo_campos`), conservando los `campo_key` actuales para no romper
   los 21.484 bloques históricos y añadiendo los que faltan:
   - competencia: `marca_competencia`, `referencia_competencia`, `precio_rimosa`,
     `precio_competencia`, `resultado_venta` (ganada / fallida / pendiente).
   - revision_seguimiento: `tema_revisado`, `interlocutor`, `canal` (presencial / teléfono /
     WhatsApp), `resultado`, `proxima_accion`.
   - promocion: `referencia`, `cantidad`, `precio_ofertado`, `canal_envio`, `respuesta_cliente`.
   - gsmart: `accesos`, `conoce_promociones`, `sabe_comprar`, `compra_realizada`, `interes_crucero`.
   - informacion_potencial: vehículos, marcas, mecánicos, referencias de consumo, potencial.
   - seguimiento e incidencia: ajustes menores de obligatoriedad y orden.
2. **Textos de `ayuda`** para todos los campos, redactados a partir de esos comentarios, en
   lenguaje directo de comercial ("Marca del competidor: sin marca la visita no se valida").
3. **`requerido_validacion`**: marcar los campos que el director exige para dar por buena la
   visita, distinto de `is_required` (obligatorio para guardar). Se usan las reglas de arriba.
4. **`placeholder`** con ejemplos reales sacados del histórico (referencias, formatos de precio).
5. **Descripción de cada motivo** (`motivos_visita.descripcion`) con el criterio de validez en
   una frase, para que se lea antes de elegir plantilla.
6. **AdminVisitas.tsx**: añadir al editor los dos campos que hoy no se pueden editar
   (`placeholder` y `requerido_validacion`) y mostrar la descripción del motivo como textarea.
7. **NuevaVisita.tsx**: mostrar el texto de `ayuda` bajo cada campo y avisar (sin bloquear el
   guardado) cuando falte un campo con `requerido_validacion`, indicando que el director puede
   marcar la visita como NO CORRECTO.

## Detalle técnico

- Migración de datos vía la herramienta de inserción: `UPDATE`/`INSERT ... ON CONFLICT` sobre
  `motivo_campos` por `(motivo_key, campo_key)`; sin cambios de esquema (las columnas
  `opciones`, `placeholder`, `requerido_validacion` ya existen).
- Ningún `campo_key` existente se borra: los que dejen de usarse se marcan con
  `sort_order` alto y `is_required=false` para no perder datos históricos.
- Sin cambios en `visita_bloques`, triggers ni funciones de validación.

No se avanza a ninguna otra fase.
