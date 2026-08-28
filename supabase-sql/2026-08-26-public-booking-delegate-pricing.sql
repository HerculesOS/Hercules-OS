-- Public course per-delegate pricing and invoicing for Hercules OS.
-- Run this in the Supabase SQL Editor only after reviewing it.
-- Adds public-course price and invoice-link fields to booking delegate rows.

alter table public.booking_delegates
  add column if not exists unit_price numeric(10, 2) not null default 0,
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists invoice_line_description text;

update public.booking_delegates
set unit_price = 0
where unit_price is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_delegates_unit_price_non_negative'
      and conrelid = 'public.booking_delegates'::regclass
  ) then
    alter table public.booking_delegates
      add constraint booking_delegates_unit_price_non_negative
      check (unit_price >= 0);
  end if;
end $$;

create index if not exists booking_delegates_invoice_id_idx
  on public.booking_delegates (invoice_id);

create index if not exists booking_delegates_booking_invoice_idx
  on public.booking_delegates (booking_id, invoice_id);
