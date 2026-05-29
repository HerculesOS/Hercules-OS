-- Phase A booking/course polish SQL for Hercules OS.
-- Run this in the Supabase SQL Editor only after reviewing it.
-- Adds multi-day booking/template fields while preserving existing one-day bookings.

alter table public.course_templates
  add column if not exists duration_days integer,
  add column if not exists default_start_time time,
  add column if not exists default_end_time time;

update public.course_templates
set duration_days = 1
where duration_days is null;

alter table public.course_templates
  alter column duration_days set default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_templates_duration_days_positive'
      and conrelid = 'public.course_templates'::regclass
  ) then
    alter table public.course_templates
      add constraint course_templates_duration_days_positive
      check (duration_days is null or duration_days >= 1);
  end if;
end $$;

alter table public.bookings
  add column if not exists end_date date;

update public.bookings
set end_date = date
where end_date is null
  and date is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_end_date_on_or_after_date'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_end_date_on_or_after_date
      check (end_date is null or date is null or end_date >= date);
  end if;
end $$;
