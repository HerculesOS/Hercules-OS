-- Whiteleaf invoice workflow: optional purchase order number.
-- Run this in the Supabase SQL Editor before deploying the app changes that
-- read/write invoices.po_number.

alter table public.invoices
  add column if not exists po_number text;

create index if not exists invoices_organisation_po_number_idx
  on public.invoices (organisation_id, po_number)
  where po_number is not null;
