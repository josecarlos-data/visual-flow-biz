ALTER TABLE public.visitas
  ADD COLUMN IF NOT EXISTS analisis_modelo text,
  ADD COLUMN IF NOT EXISTS analisis_prompt_version text;

COMMENT ON COLUMN public.visitas.analisis_modelo IS 'Modelo de IA con el que se extrajeron los bloques desde la transcripción.';
COMMENT ON COLUMN public.visitas.analisis_prompt_version IS 'Versión del prompt de extracción (constante VERSION_PROMPT en la función visita-voz).';