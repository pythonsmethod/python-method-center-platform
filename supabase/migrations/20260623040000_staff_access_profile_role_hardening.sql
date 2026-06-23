-- P0-008: Staff/admin access depends on profile role values.
-- Authenticated clients may create/update their own profile, but role and
-- account status must remain server/staff-controlled fields.

create or replace function public.protect_profile_staff_fields_from_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if tg_op = 'INSERT' then
      new.role := 'client';
      new.status := 'active';
      return new;
    end if;

    if tg_op = 'UPDATE' then
      if new.id is distinct from old.id then
        raise exception 'Clients cannot transfer profile ownership.';
      end if;

      new.role := old.role;
      new.status := old.status;
      return new;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_staff_fields_from_client
on public.profiles;

create trigger protect_profile_staff_fields_from_client
before insert or update on public.profiles
for each row
execute function public.protect_profile_staff_fields_from_client();

comment on function public.protect_profile_staff_fields_from_client() is
  'Prevents authenticated client writes from setting or changing staff-controlled profile role/status fields.';
