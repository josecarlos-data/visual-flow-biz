ALTER TABLE public.catalogos_opciones ADD COLUMN IF NOT EXISTS nota text;

-- 2. Competidores: altas al final del orden
WITH base AS (SELECT COALESCE(MAX(orden), 0) AS m FROM public.catalogos_opciones WHERE clave = 'competidores')
INSERT INTO public.catalogos_opciones (clave, valor, orden, is_active, nota)
SELECT 'competidores', v.valor, base.m + v.i, true, 'Alta 08/2026 tras análisis de frecuencia del histórico de visitas.'
FROM base, (VALUES ('Lubricantes Bailén',1),('Banelub',2),('Costasol',3),('Franpe',4),('Garay',5),('Recambios Eurotruck',6),('DIESSA',7),('Provein',8),('Salysan',9),('Sáez',10)) AS v(valor, i)
ON CONFLICT DO NOTHING;

-- 3. Marcas de vehículo
WITH base AS (SELECT COALESCE(MAX(orden), 0) AS m FROM public.catalogos_opciones WHERE clave = 'marcas_vehiculo')
INSERT INTO public.catalogos_opciones (clave, valor, orden, is_active, nota)
SELECT 'marcas_vehiculo', v.valor, base.m + v.i, true, 'Alta 08/2026 tras análisis de frecuencia del histórico de visitas.'
FROM base, (VALUES ('Nissan',1),('Ford',2),('Mitsubishi / Fuso',3),('Isuzu',4)) AS v(valor, i)
ON CONFLICT DO NOTHING;

UPDATE public.catalogos_opciones
SET is_active = false,
    nota = 'Desactivado 08/2026: son tipos de vehículo, no marcas. Sustituidos por el campo segmento_vehiculo. La marca del remolque va ahora en marcas_remolque.',
    updated_at = now()
WHERE clave = 'marcas_vehiculo'
  AND valor IN ('Remolques / Semirremolques', 'Furgoneta / Vehículo ligero', 'Autobús');

-- 4. Tipos de eje
WITH base AS (SELECT COALESCE(MAX(orden), 0) AS m FROM public.catalogos_opciones WHERE clave = 'tipo_ejes')
INSERT INTO public.catalogos_opciones (clave, valor, orden, is_active, nota)
SELECT 'tipo_ejes', 'JOST', base.m + 1, true, 'Alta 08/2026 tras análisis de frecuencia del histórico de visitas.'
FROM base
ON CONFLICT DO NOTHING;

UPDATE public.catalogos_opciones
SET is_active = false,
    nota = 'Desactivado 08/2026: 1 y 0 apariciones respectivamente en 18.647 observaciones del histórico.',
    updated_at = now()
WHERE clave = 'tipo_ejes' AND valor IN ('Fruehauf', 'Guitart');

-- 5. Catálogo nuevo marcas_remolque
INSERT INTO public.catalogos_opciones (clave, valor, orden, is_active, nota)
VALUES
  ('marcas_remolque','Schmitz',1,true,'Alta 08/2026 tras análisis del histórico de visitas.'),
  ('marcas_remolque','Lecitrailer',2,true,'Alta 08/2026 tras análisis del histórico de visitas.'),
  ('marcas_remolque','Leciñena',3,true,'Alta 08/2026 tras análisis del histórico de visitas.'),
  ('marcas_remolque','Kögel',4,true,'Alta 08/2026 tras análisis del histórico de visitas.'),
  ('marcas_remolque','Montenegro',5,true,'Alta 08/2026 tras análisis del histórico de visitas.'),
  ('marcas_remolque','Otra',6,true,'Alta 08/2026 tras análisis del histórico de visitas.')
ON CONFLICT DO NOTHING;

-- 6. Catálogo nuevo marcas_recambio
INSERT INTO public.catalogos_opciones (clave, valor, orden, is_active, nota)
SELECT 'marcas_recambio', v.valor, v.i, true, 'Alta 08/2026 tras análisis del histórico de visitas.'
FROM (VALUES ('Icer',1),('Banner',2),('Axcar',3),('Knorr',4),('Dometic',5),('Wabco',6),('Mann Filter',7),('Sachs',8),('Bosch',9),('Textar',10),('Manesman',11),('Haldex',12),('Diesel Technic',13),('Monroe',14),('Ferodo',15),('Valeo',16),('Mahle',17),('Varta',18),('Sampa',19),('Febi',20),('Gates',21),('SKF',22),('Fersa',23),('Fleetguard',24),('Nissens',25),('Jurid',26),('Titanium',27),('Contitech',28),('Elring',29),('Victor Reinz',30),('Otra',31)) AS v(valor, i)
ON CONFLICT DO NOTHING;

-- 7. Campo nuevo marca_remolque en informacion_potencial, entre marcas_vehiculo y segmento_vehiculo
UPDATE public.motivo_campos
SET sort_order = sort_order + 1, updated_at = now()
WHERE motivo_key = 'informacion_potencial'
  AND sort_order > (SELECT sort_order FROM public.motivo_campos WHERE motivo_key = 'informacion_potencial' AND campo_key = 'marcas_vehiculo');

INSERT INTO public.motivo_campos (motivo_key, campo_key, label, ayuda, tipo, is_required, sort_order, opciones, requerido_validacion, is_active, visibilidad)
SELECT 'informacion_potencial', 'marca_remolque', 'Marca del remolque',
       'Fabricante del remolque o semirremolque. No confundir con el eje: un Schmitz puede montar ejes BPW o SAF.',
       'multiselect', false,
       (SELECT sort_order + 1 FROM public.motivo_campos WHERE motivo_key = 'informacion_potencial' AND campo_key = 'marcas_vehiculo'),
       '{"catalogo":"marcas_remolque"}'::jsonb, false, true, 'normal'
WHERE NOT EXISTS (
  SELECT 1 FROM public.motivo_campos WHERE motivo_key = 'informacion_potencial' AND campo_key = 'marca_remolque'
);