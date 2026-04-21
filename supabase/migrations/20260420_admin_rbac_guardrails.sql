alter table public.salespeople
  add column if not exists auth_email text,
  add column if not exists phone_digits text;

update public.salespeople
set auth_email = coalesce(nullif(lower(trim(auth_email)), ''), nullif(lower(trim(email)), ''))
where auth_email is null or auth_email = '';

update public.salespeople
set phone_digits = nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')
where phone_digits is distinct from nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '');

update public.salespeople
set permissions = jsonb_build_object(
  'orders', true,
  'clients', true,
  'products', true,
  'companies', true,
  'team', true,
  'settings', true
)
where is_admin is true;

create index if not exists salespeople_auth_user_id_idx on public.salespeople (auth_user_id);
create index if not exists salespeople_phone_digits_idx on public.salespeople (phone_digits);
create unique index if not exists salespeople_auth_email_unique_idx
  on public.salespeople (auth_email)
  where auth_email is not null;

create or replace function public.normalize_salespeople_security_fields()
returns trigger
language plpgsql
as $$
begin
  if new.email is not null then
    new.email := nullif(lower(trim(new.email)), '');
  end if;

  if new.auth_email is not null then
    new.auth_email := nullif(lower(trim(new.auth_email)), '');
  elsif new.email is not null then
    new.auth_email := new.email;
  end if;

  new.phone_digits := nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), '');

  if new.is_admin is true then
    new.permissions := jsonb_build_object(
      'orders', true,
      'clients', true,
      'products', true,
      'companies', true,
      'team', true,
      'settings', true
    );
  else
    new.permissions := coalesce(new.permissions, '{}'::jsonb);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_salespeople_security_fields on public.salespeople;
create trigger trg_salespeople_security_fields
before insert or update on public.salespeople
for each row
execute function public.normalize_salespeople_security_fields();

create or replace function public.prevent_last_admin_lockout()
returns trigger
language plpgsql
as $$
declare
  remaining_admins integer;
begin
  if tg_op = 'DELETE' then
    if old.is_admin is true then
      select count(*) into remaining_admins
      from public.salespeople
      where is_admin is true
        and id <> old.id;

      if remaining_admins = 0 then
        raise exception 'At least one admin must remain active.';
      end if;
    end if;

    return old;
  end if;

  if old.is_admin is true and coalesce(new.is_admin, false) = false then
    select count(*) into remaining_admins
    from public.salespeople
    where is_admin is true
      and id <> old.id;

    if remaining_admins = 0 then
      raise exception 'At least one admin must remain active.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_salespeople_last_admin_update on public.salespeople;
create trigger trg_salespeople_last_admin_update
before update of is_admin on public.salespeople
for each row
execute function public.prevent_last_admin_lockout();

drop trigger if exists trg_salespeople_last_admin_delete on public.salespeople;
create trigger trg_salespeople_last_admin_delete
before delete on public.salespeople
for each row
execute function public.prevent_last_admin_lockout();

create or replace function public.app_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.salespeople s
    where s.auth_user_id = auth.uid()
      and s.is_admin is true
  );
$$;

create or replace function public.app_has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.salespeople s
    where s.auth_user_id = auth.uid()
      and (
        s.is_admin is true
        or coalesce((s.permissions ->> permission_key)::boolean, false)
      )
  );
$$;
