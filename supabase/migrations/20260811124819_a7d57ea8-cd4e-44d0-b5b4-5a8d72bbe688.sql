INSERT INTO public.motivo_campos (motivo_key, campo_key, label, ayuda, tipo, opciones, is_required, requerido_validacion, sort_order, is_active, visibilidad, placeholder) VALUES
('informacion_potencial','tipo_negocio','Tipo de negocio','Qué es el cliente: taller que repara a terceros, flotista con vehículos propios, mixto, concesionario u otro.','select','["Taller","Flotista","Mixto","Concesionario","Otro"]'::jsonb,false,false,100,true,'normal',NULL),
('informacion_potencial','num_electromecanicos','Nº de electromecánicos','Personal con perfil eléctrico/electrónico. Los mecánicos convencionales van en "Nº de mecánicos".','numero','[]'::jsonb,false,false,110,true,'normal',NULL),
('informacion_potencial','segmento_vehiculo','Segmento de vehículo','Tipos de vehículo que entran en su taller o forman su flota. Marca todos los que apliquen.','multiselect','["Camión","Tractora","Remolque/Plataforma","Frigorífico","Turismo","Furgoneta","Bus","Agrícola","Obra pública"]'::jsonb,false,false,120,true,'normal',NULL),
('informacion_potencial','maquina_diagnosis','Máquina de diagnosis','Equipo de diagnosis que tiene (marca y modelo si lo dice), o "no tiene".','texto','[]'::jsonb,false,false,130,true,'normal','Ej.: Texa, Jaltest, no tiene'),
('informacion_potencial','proveedor_principal','Proveedor principal','Con quién compra hoy la mayor parte del recambio. Elige de la lista; la misma empresa debe registrarse siempre igual.','select','{"catalogo": "competidores"}'::jsonb,false,false,140,true,'normal',NULL),
('informacion_potencial','capacidades_taller','Capacidades del taller','Medios y trabajos que puede hacer: remachadora, banco de pruebas, frenos, aire acondicionado, tacógrafo, ITV...','texto','[]'::jsonb,false,false,150,true,'normal','Ej.: remachadora, banco de pruebas, frenos'),
('informacion_potencial','compromisos','Compromisos con otros proveedores','Acuerdos, exclusividades, rappels o contratos que le atan a otro proveedor.','texto','[]'::jsonb,false,false,160,true,'normal',NULL)
ON CONFLICT (motivo_key, campo_key) DO UPDATE SET
  label = EXCLUDED.label,
  ayuda = EXCLUDED.ayuda,
  tipo = EXCLUDED.tipo,
  opciones = EXCLUDED.opciones,
  sort_order = EXCLUDED.sort_order,
  placeholder = EXCLUDED.placeholder,
  is_active = true;

UPDATE public.motivo_campos
SET label = 'Nº de mecánicos (no electromecánicos)',
    ayuda = '"NÚMERO MECÁNICOS": plantilla real del taller, sin contar a los electromecánicos (esos van en su propio campo).'
WHERE motivo_key = 'informacion_potencial' AND campo_key = 'num_mecanicos';