ALTER TABLE public.visitas
  ADD COLUMN IF NOT EXISTS hora time,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'cliente',
  ADD COLUMN IF NOT EXISTS validacion text,
  ADD COLUMN IF NOT EXISTS latitud numeric,
  ADD COLUMN IF NOT EXISTS longitud numeric,
  ADD COLUMN IF NOT EXISTS ruta text,
  ADD COLUMN IF NOT EXISTS zona text,
  ADD COLUMN IF NOT EXISTS comercial_nombre text,
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS cliente_externo text;

ALTER TABLE public.visitas ALTER COLUMN cod_cliente DROP NOT NULL;

ALTER TABLE public.motivo_campos
  ADD COLUMN IF NOT EXISTS opciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS placeholder text;

CREATE INDEX IF NOT EXISTS visitas_fecha_idx ON public.visitas (fecha DESC);
CREATE INDEX IF NOT EXISTS visitas_cod_cliente_idx ON public.visitas (cod_cliente);
CREATE INDEX IF NOT EXISTS visitas_motivo_idx ON public.visitas (motivo_key);
CREATE UNIQUE INDEX IF NOT EXISTS visitas_dedupe_idx
  ON public.visitas (COALESCE(cod_cliente, -1), fecha, COALESCE(hora, '00:00'::time), COALESCE(comercial_nombre, ''))
  WHERE origen = 'gespromo';

DELETE FROM public.motivo_campos;
DELETE FROM public.motivos_visita;

INSERT INTO public.motivos_visita (key, nombre, descripcion, color, sort_order, is_active) VALUES
  ('seguimiento','Seguimiento','Visita de seguimiento habitual del cliente','#0ea5e9',10,true),
  ('promocion','Promoción / Oferta / Campaña','Presentación de una oferta, promoción o campaña','#22c55e',20,true),
  ('revision_seguimiento','Revisión de seguimiento','Revisión del resultado de una oferta o acción anterior','#a855f7',30,true),
  ('competencia','Estudio de competencia','Comparativa de precios y marcas frente a la competencia','#f97316',40,true),
  ('gsmart','GSMart / Viaje crucero','Seguimiento de GSMart y campaña del viaje crucero','#14b8a6',50,true),
  ('informacion_potencial','Información importante / Potencial','Datos del taller, flota y potencial del cliente','#eab308',60,true),
  ('incidencia','Incidencia','Problema o reclamación del cliente','#ef4444',70,true);

INSERT INTO public.motivo_campos (motivo_key, campo_key, label, ayuda, tipo, is_required, sort_order, opciones) VALUES
  ('seguimiento','situacion','Situación del cliente','Cómo está el taller, carga de trabajo, personas con las que se ha hablado','texto_largo',true,10,'[]'),
  ('seguimiento','necesidades','Necesidades detectadas','Productos o servicios que puede necesitar','texto_largo',false,20,'[]'),
  ('seguimiento','acuerdos','Acuerdos alcanzados','Pedidos cerrados o compromisos','texto_largo',false,30,'[]'),
  ('seguimiento','proxima_accion','Próxima acción','Qué hay que hacer después','texto',true,40,'[]'),
  ('seguimiento','fecha_proxima_accion','Fecha próxima acción',NULL,'fecha',false,50,'[]'),

  ('promocion','producto','Producto ofertado','Descripción del artículo o campaña','texto',true,10,'[]'),
  ('promocion','referencia','Referencia','Referencia del artículo','texto',false,20,'[]'),
  ('promocion','precio_ofertado','Precio ofertado (€)',NULL,'numero',false,30,'[]'),
  ('promocion','respuesta_cliente','Respuesta del cliente',NULL,'select',true,40,'["Interesado","Lo piensa","Pedido cerrado","Rechaza"]'),
  ('promocion','importe_estimado','Importe estimado (€)',NULL,'numero',false,50,'[]'),
  ('promocion','proxima_accion','Próxima acción',NULL,'texto',false,60,'[]'),

  ('revision_seguimiento','oferta_revisada','Oferta que se revisa','Qué oferta o acción anterior se está revisando','texto',true,10,'[]'),
  ('revision_seguimiento','referencia','Referencia',NULL,'texto',false,20,'[]'),
  ('revision_seguimiento','resultado','Resultado',NULL,'select',true,30,'["Pedido","Pendiente","Perdida"]'),
  ('revision_seguimiento','motivo_perdida','Motivo si se pierde','Precio, plazo, marca, competencia...','texto_largo',false,40,'[]'),
  ('revision_seguimiento','importe','Importe (€)',NULL,'numero',false,50,'[]'),
  ('revision_seguimiento','proxima_accion','Próxima acción',NULL,'texto',false,60,'[]'),

  ('competencia','competidor','Competidor','Empresa a la que compra','texto',true,10,'[]'),
  ('competencia','referencia','Referencia comparada',NULL,'texto',false,20,'[]'),
  ('competencia','precio_rimosa','Precio Rimosa (€)',NULL,'numero',false,30,'[]'),
  ('competencia','precio_competencia','Precio competencia (€)',NULL,'numero',false,40,'[]'),
  ('competencia','marca_competencia','Marca que compra',NULL,'texto',false,50,'[]'),
  ('competencia','conclusion','Conclusión y acción propuesta',NULL,'texto_largo',true,60,'[]'),

  ('gsmart','tema','Tema tratado',NULL,'select',true,10,'["GSMart","Viaje crucero","Ambos"]'),
  ('gsmart','entradas_mes','Entradas del mes',NULL,'numero',false,20,'[]'),
  ('gsmart','importe_gsmart','Importe pedido por GSMart (€)',NULL,'numero',false,30,'[]'),
  ('gsmart','incidencias','Incidencias detectadas','Problemas de acceso, uso o dudas','texto_largo',false,40,'[]'),
  ('gsmart','formacion','Formación o demostración realizada',NULL,'texto_largo',false,50,'[]'),
  ('gsmart','proxima_accion','Próxima acción',NULL,'texto',false,60,'[]'),

  ('informacion_potencial','persona_contacto','Persona de contacto',NULL,'texto',true,10,'[]'),
  ('informacion_potencial','num_vehiculos','Nº de vehículos',NULL,'numero',false,20,'[]'),
  ('informacion_potencial','marcas_vehiculo','Marcas de vehículo','Scania, Volvo, DAF, MAN, Mercedes...','texto',false,30,'[]'),
  ('informacion_potencial','tipo_ejes','Tipo de ejes','BPW, SAF, ROR...','texto',false,40,'[]'),
  ('informacion_potencial','num_mecanicos','Nº de mecánicos',NULL,'numero',false,50,'[]'),
  ('informacion_potencial','tipo_trabajo','Tipo de trabajo','Mantenimiento, frenos, valvulería, motor...','texto_largo',false,60,'[]'),
  ('informacion_potencial','potencial_estimado','Potencial estimado (€/año)',NULL,'numero',false,70,'[]'),
  ('informacion_potencial','observaciones','Otras observaciones',NULL,'texto_largo',false,80,'[]'),

  ('incidencia','descripcion','Descripción de la incidencia',NULL,'texto_largo',true,10,'[]'),
  ('incidencia','impacto','Impacto para el cliente',NULL,'texto_largo',false,20,'[]'),
  ('incidencia','solucion','Solución acordada',NULL,'texto_largo',true,30,'[]');

CREATE OR REPLACE FUNCTION public.importar_visitas_historicas(_rows jsonb, _reset boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;

  IF _reset THEN
    DELETE FROM public.visitas WHERE origen = 'gespromo';
  END IF;

  WITH parsed AS (
    SELECT
      NULLIF(r->>'cod_cliente','')::int AS cod_cliente,
      NULLIF(r->>'cliente_externo','') AS cliente_externo,
      NULLIF(r->>'motivo_key','') AS motivo_key,
      (r->>'fecha')::date AS fecha,
      NULLIF(r->>'hora','')::time AS hora,
      NULLIF(r->>'tipo','') AS tipo,
      NULLIF(r->>'estado','') AS estado,
      NULLIF(r->>'validacion','') AS validacion,
      NULLIF(r->>'observaciones','') AS observaciones,
      NULLIF(r->>'comercial','') AS comercial,
      NULLIF(r->>'comercial_nombre','') AS comercial_nombre,
      NULLIF(r->>'ruta','') AS ruta,
      NULLIF(r->>'zona','') AS zona,
      NULLIF(r->>'titulo','') AS titulo,
      NULLIF(r->>'latitud','')::numeric AS latitud,
      NULLIF(r->>'longitud','')::numeric AS longitud
    FROM jsonb_array_elements(_rows) r
    WHERE NULLIF(r->>'fecha','') IS NOT NULL
  ), dedup AS (
    SELECT DISTINCT ON (COALESCE(cod_cliente,-1), fecha, COALESCE(hora,'00:00'::time), COALESCE(comercial_nombre,'')) *
    FROM parsed
    ORDER BY COALESCE(cod_cliente,-1), fecha, COALESCE(hora,'00:00'::time), COALESCE(comercial_nombre,''), length(COALESCE(observaciones,'')) DESC
  )
  INSERT INTO public.visitas (cod_cliente, cliente_externo, motivo_key, fecha, hora, tipo, estado,
    validacion, observaciones, vendedor, comercial_nombre, ruta, zona, titulo, latitud, longitud, campos, origen)
  SELECT cod_cliente, cliente_externo, motivo_key, fecha, hora, COALESCE(tipo,'cliente'), COALESCE(estado,'realizada'),
    validacion, observaciones, comercial, comercial_nombre, ruta, zona, titulo, latitud, longitud, '{}'::jsonb, 'gespromo'
  FROM dedup
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.importar_visitas_historicas(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.importar_visitas_historicas(jsonb, boolean) TO authenticated;