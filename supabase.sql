-- Estado completo de la dieta de cada usuario (un unico registro por usuario).
create table if not exists public.dietas (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  actualizado_en timestamptz not null default now(),
  creado_en timestamptz not null default now()
);

comment on table public.dietas is 'Estado de Mi Plan de Dieta: ajustes, registros de comidas, listas de compra y excepciones de cada usuario.';
comment on column public.dietas.datos is 'Documento JSON con todo el estado de la aplicacion.';
comment on column public.dietas.revision is 'Se incrementa en cada guardado para detectar cambios desde otro dispositivo.';

-- Actualiza la marca de tiempo y la revision en cada escritura.
create or replace function public.tocar_dieta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.actualizado_en := now();
  if new.revision is null or new.revision <= old.revision then
    new.revision := coalesce(old.revision, 0) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tocar_dieta on public.dietas;
create trigger trg_tocar_dieta
  before update on public.dietas
  for each row execute function public.tocar_dieta();

-- Cada usuario solo puede ver y modificar su propia fila.
alter table public.dietas enable row level security;

drop policy if exists "dietas_select_propias" on public.dietas;
create policy "dietas_select_propias" on public.dietas
  for select to authenticated using (auth.uid() = usuario_id);

drop policy if exists "dietas_insert_propias" on public.dietas;
create policy "dietas_insert_propias" on public.dietas
  for insert to authenticated with check (auth.uid() = usuario_id);

drop policy if exists "dietas_update_propias" on public.dietas;
create policy "dietas_update_propias" on public.dietas
  for update to authenticated using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists "dietas_delete_propias" on public.dietas;
create policy "dietas_delete_propias" on public.dietas
  for delete to authenticated using (auth.uid() = usuario_id);

-- Bucket privado para las fotografias de los platos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-dieta', 'fotos-dieta', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Cada usuario solo accede a la carpeta que lleva su identificador.
drop policy if exists "fotos_dieta_select" on storage.objects;
create policy "fotos_dieta_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-dieta' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos_dieta_insert" on storage.objects;
create policy "fotos_dieta_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-dieta' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos_dieta_update" on storage.objects;
create policy "fotos_dieta_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos-dieta' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fotos-dieta' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos_dieta_delete" on storage.objects;
create policy "fotos_dieta_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-dieta' and (storage.foldername(name))[1] = auth.uid()::text);
