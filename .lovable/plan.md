# Ayudas de los 44 campos de plantilla (FASE 3, remate)

Objetivo: que el campo `ayuda` de todos los campos activos esté relleno y sirva a la vez de instrucción al comercial y de descripción que se manda al modelo en la FASE 4.

Nada de esto avanza a otra fase: solo se actualizan textos de `motivo_campos.ayuda` (una sola operación de datos, sin cambios de esquema).

## Criterios de redacción

- **Selects**: la ayuda enumera cuándo se elige cada opción, no qué es el campo. Con esto el modelo puede mapear "se lo va a mirar" a la opción correcta.
- **Campos evidentes** (importes, fechas, números, nombres): una frase corta sobre el formato o el dato esperado.
- **`proxima_accion`**: texto distinto en cada uno de los seis motivos donde aparece (alta_reapertura, gestion_cobro, gsmart, promocion, revision_seguimiento, viaje_incentivo, visita_partner), referido a lo que toca hacer en ese tipo de visita.
- **Campos de sistema** (`promocion.fuera_de_plazo`, `promocion.motivo_fuera_plazo`): ayuda como documentación interna — quién los rellena, cuándo y con qué criterio. Se conserva la de `gsmart.accesos` e `importe_pedidos`.
- Se respetan las ayudas ya escritas a partir de los comentarios del director; solo se completan las vacías y se reescriben los selects que hoy no explican sus opciones.

## Ejemplos del texto que se escribirá

- `promocion.respuesta_cliente`: "Pedido cerrado = te dice que sí y lo apuntas. Interesado = lo quiere pero no cierra hoy. Lo piensa = te da largas o lo tiene que consultar. Rechaza = te dice que no."
- `revision_seguimiento.resultado`: "Pedido conseguido = sale con pedido. Sigue pendiente = no cierra pero no ha dicho que no. Venta perdida = compra a otro o descarta."
- `gsmart.sabe_comprar`: "Sí solo si le has visto hacer un pedido sin ayuda. Si necesita que se lo hagas tú, es No."
- `incidencia.tipo_incidencia`: "Entrega = falta, retraso o error de envío. Garantía = pieza fallada dentro de garantía. Abono = devolución o nota de crédito. Facturación = precio, IVA o factura mal. Calidad del producto = pieza defectuosa fuera de garantía. Otra = lo que no encaje arriba, explícalo en la descripción."
- `gestion_cobro.compromiso_pago`: "Paga en el acto = te llevas el cobro. Fecha comprometida = te da día concreto. Pago fraccionado = acuerda pagos parciales. Se niega a pagar = no asume la deuda."
- `alta_reapertura.origen_alta`, `competencia.resultado_venta`, `revision_seguimiento.canal`, `visita_partner.partner`, `promocion.canal_envio`, `gsmart.tema`: mismo tratamiento opción por opción.
- Sistema, `promocion.fuera_de_plazo`: "Uso interno. Lo marca el sistema al comparar la fecha de la visita con las fechas de la campaña; el comercial no lo ve ni lo teclea."

## Datos personales en `alta_reapertura`

En los campos `razon_social`, `cif` y `persona_contacto` la ayuda dirá expresamente que solo se anote lo imprescindible para dar de alta y nada de datos personales adicionales (DNI del contacto, móvil particular, direcciones privadas, notas sobre la persona).

Recomendación, para que la decidas:

- **`cif`**: proponemos sacarlo de la plantilla. Es un dato fiscal que administración toma del documento de alta en el ERP; teclearlo en una nota de visita duplica el dato y lo deja fuera de control. Hoy además es `requerido_validacion`, lo que empuja al comercial a rellenarlo siempre.
- **`persona_contacto`** (hoy "Persona de contacto y teléfono"): proponemos dejar solo nombre y cargo, y que el teléfono se dé de alta en la ficha del cliente, no en el texto libre de la visita.
- `razon_social` sí se queda: es lo que identifica el alta.

Si prefieres no tocar la plantilla, se quedan los tres y solo se refuerza la ayuda.

## Verificación

```sql
SELECT count(*) FROM motivo_campos WHERE is_active AND (ayuda IS NULL OR ayuda = '');
-- esperado: 0
```

Se comprueba también que ninguna de las siete `proxima_accion` comparte texto.
