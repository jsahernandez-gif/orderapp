alter table public.products
  add column if not exists reference_code text;

alter table public.orders
  add column if not exists item_discount_total numeric default 0;

update public.products
set reference_code = nullif(trim(reference_code), '')
where reference_code is not null;

create index if not exists products_reference_code_idx
  on public.products (lower(reference_code))
  where reference_code is not null;

create or replace function public.normalize_product_reference_code()
returns trigger
language plpgsql
as $$
begin
  new.reference_code := nullif(trim(new.reference_code), '');

  if new.reference_code is not null and new.reference_code !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'reference_code must use only letters, numbers, hyphens, or underscores.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_products_reference_code on public.products;
create trigger trg_products_reference_code
before insert or update of reference_code on public.products
for each row
execute function public.normalize_product_reference_code();

update public.salespeople
set
  is_admin = true,
  permissions = jsonb_build_object(
    'orders', true,
    'clients', true,
    'products', true,
    'companies', true,
    'team', true,
    'settings', true
  )
where lower(coalesce(email, auth_email, '')) = 'jsahernandez@icloud.com';
