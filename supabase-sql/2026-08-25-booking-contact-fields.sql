-- Booking email recipient model.
-- Run this in Supabase SQL Editor before deploying app changes that read/write
-- booking_contact_* fields on bookings.

alter table public.bookings
  add column if not exists booking_contact_name text,
  add column if not exists booking_contact_email text,
  add column if not exists booking_contact_phone text;

create index if not exists bookings_organisation_contact_email_idx
  on public.bookings (organisation_id, booking_contact_email)
  where booking_contact_email is not null;
