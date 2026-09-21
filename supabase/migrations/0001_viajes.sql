-- Tabla viajes (PLAN.md §5). El estado "visitado" no se almacena: se deriva de esta tabla.
create table public.viajes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pais_iso        text not null check (pais_iso ~ '^[A-Z]{3}$'),
  subdivision_iso text check (subdivision_iso ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'),
  lugar           text,
  fecha_inicio    date not null,
  fecha_fin       date,
  tipo            text not null check (tipo in ('visita', 'escala')),
  notas           text,
  created_at      timestamptz not null default now(),
  check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create index viajes_user_id_idx on public.viajes (user_id);
create index viajes_user_pais_idx on public.viajes (user_id, pais_iso);

alter table public.viajes enable row level security;

create policy "viajes_select_own" on public.viajes
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "viajes_insert_own" on public.viajes
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "viajes_update_own" on public.viajes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "viajes_delete_own" on public.viajes
  for delete to authenticated using ((select auth.uid()) = user_id);
