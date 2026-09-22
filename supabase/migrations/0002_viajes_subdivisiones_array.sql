-- subdivision_iso (texto único) pasa a subdivisiones (array): un viaje puede cubrir
-- varias subdivisiones del mismo país (PLAN.md, ampliación de la Fase 5.4).
alter table public.viajes add column subdivisiones text[];

update public.viajes
  set subdivisiones = array[subdivision_iso]
  where subdivision_iso is not null;

alter table public.viajes drop column subdivision_iso;

-- Los valores siempre llegan desde un <select> poblado por nuestros propios JSON
-- (nunca texto libre), así que basta comprobar que el array no esté vacío cuando no es
-- null; validar cada código por regex requeriría una función auxiliar que este proyecto
-- no necesita.
alter table public.viajes add constraint viajes_subdivisiones_no_vacio
  check (subdivisiones is null or array_length(subdivisiones, 1) > 0);
