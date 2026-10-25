-- Ejecutar una sola vez en el proyecto existente, después de verificar
-- que la tabla está en public y antes de publicar el cliente actualizado.
-- El ALTER TABLE conserva el OID, las filas, FK, RLS, políticas y el trigger.
begin;

create schema if not exists dieta;

do $$
declare
  tabla_oid oid := to_regclass('public.dietas');
  filas_antes bigint;
begin
  if tabla_oid is null or to_regclass('dieta.dietas') is not null then
    raise exception 'Estado inesperado: se requiere public.dietas y ausencia de dieta.dietas';
  end if;
  lock table public.dietas in access exclusive mode;
  select count(*) into filas_antes from public.dietas;
  alter table public.dietas set schema dieta;
  if to_regclass('dieta.dietas')::oid <> tabla_oid
     or (select count(*) from dieta.dietas) <> filas_antes then
    raise exception 'La identidad o el número de filas no coincide; se revierte la migración';
  end if;
end
$$;

grant usage on schema dieta to authenticated, service_role;
alter function public.tocar_dieta() set schema dieta;
alter function dieta.tocar_dieta() set search_path = '';
grant select, insert, update, delete on dieta.dietas to authenticated;

-- Se conserva la lista de esquemas expuestos que ya utiliza este proyecto.
alter role authenticator set pgrst.db_schemas = 'public, Audiobiblioteca, dieta';
notify pgrst, 'reload config';
commit;
