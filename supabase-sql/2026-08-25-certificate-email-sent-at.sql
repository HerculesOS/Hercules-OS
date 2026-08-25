-- Certificate email tracking.
-- Run this in Supabase SQL Editor before deploying app changes that read/write
-- certificates.certificate_emailed_at.

alter table public.certificates
  add column if not exists certificate_emailed_at timestamptz;

create index if not exists certificates_organisation_emailed_at_idx
  on public.certificates (organisation_id, certificate_emailed_at)
  where certificate_emailed_at is not null;
