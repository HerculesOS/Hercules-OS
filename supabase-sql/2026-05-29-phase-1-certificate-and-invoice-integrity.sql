-- Phase 1 integrity SQL for Hercules OS.
-- Run this in the Supabase SQL Editor only after reviewing it.
-- It backfills missing certificate verification IDs and adds uniqueness checks
-- that make browser-side retry logic safe under concurrent invoice creation.

create extension if not exists pgcrypto;

do $$
declare
  verification_id_type text;
begin
  select data_type
  into verification_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'certificates'
    and column_name = 'verification_id';

  if verification_id_type is null then
    raise exception 'public.certificates.verification_id does not exist';
  end if;

  if exists (
    select 1
    from public.certificates
    where verification_id is not null
    group by verification_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate certificate verification_id values exist. Resolve them before adding the unique index.';
  end if;

  if verification_id_type = 'uuid' then
    update public.certificates
    set verification_id = gen_random_uuid()
    where verification_id is null;

    alter table public.certificates
      alter column verification_id set default gen_random_uuid();
  else
    update public.certificates
    set verification_id = gen_random_uuid()::text
    where verification_id is null;

    alter table public.certificates
      alter column verification_id set default gen_random_uuid()::text;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from public.invoices
    where organisation_id is not null
      and invoice_number is not null
    group by organisation_id, invoice_number
    having count(*) > 1
  ) then
    raise exception 'Duplicate invoice numbers exist within at least one organisation. Resolve them before adding the unique index.';
  end if;
end $$;

create unique index if not exists certificates_verification_id_unique
  on public.certificates (verification_id)
  where verification_id is not null;

create unique index if not exists invoices_organisation_invoice_number_unique
  on public.invoices (organisation_id, invoice_number)
  where organisation_id is not null
    and invoice_number is not null;
