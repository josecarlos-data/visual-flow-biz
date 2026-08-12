UPDATE public.motivo_campos
   SET ayuda = 'Si no conseguiste el precio, pon 0. Así queda constancia de que se intentó y el 0 nunca se confunde con un precio real.'
 WHERE campo_key IN ('precio_rimosa', 'precio_competencia', 'precio_ofertado');