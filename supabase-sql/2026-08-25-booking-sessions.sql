-- Non-consecutive booking course dates for Hercules OS.
-- Run this in the Supabase SQL Editor only after reviewing it.
-- Adds booking-level course sessions so bookings can have specific course dates/times.

create extension if not exists pgcrypto;

create table if not exists public.booking_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  session_date date not null,
  start_time time,
  end_time time,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_sessions_sort_order_positive'
      and conrelid = 'public.booking_sessions'::regclass
  ) then
    alter table public.booking_sessions
      add constraint booking_sessions_sort_order_positive
      check (sort_order >= 1);
  end if;
end $$;

create index if not exists booking_sessions_booking_sort_idx
  on public.booking_sessions (booking_id, sort_order);

create index if not exists booking_sessions_organisation_date_idx
  on public.booking_sessions (organisation_id, session_date);

create unique index if not exists booking_sessions_booking_sort_order_unique
  on public.booking_sessions (booking_id, sort_order);

-- Backfill existing bookings into consecutive sessions so current bookings keep
-- their existing one-day and date-range behaviour.
insert into public.booking_sessions (
  booking_id,
  organisation_id,
  session_date,
  start_time,
  end_time,
  sort_order
)
select
  bookings.id,
  bookings.organisation_id,
  generated_sessions.session_date::date,
  bookings.start_time,
  bookings.end_time,
  row_number() over (
    partition by bookings.id
    order by generated_sessions.session_date
  )::integer as sort_order
from public.bookings
cross join lateral generate_series(
  bookings.date::date,
  coalesce(bookings.end_date, bookings.date)::date,
  interval '1 day'
) as generated_sessions(session_date)
where bookings.date is not null
  and not exists (
    select 1
    from public.booking_sessions existing_sessions
    where existing_sessions.booking_id = bookings.id
  );

alter table public.booking_sessions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_sessions'
      and policyname = 'Users can view booking sessions for their organisation'
  ) then
    create policy "Users can view booking sessions for their organisation"
      on public.booking_sessions
      for select
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = booking_sessions.organisation_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_sessions'
      and policyname = 'Users can create booking sessions for their organisation'
  ) then
    create policy "Users can create booking sessions for their organisation"
      on public.booking_sessions
      for insert
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = booking_sessions.organisation_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_sessions'
      and policyname = 'Users can update booking sessions for their organisation'
  ) then
    create policy "Users can update booking sessions for their organisation"
      on public.booking_sessions
      for update
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = booking_sessions.organisation_id
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = booking_sessions.organisation_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_sessions'
      and policyname = 'Users can delete booking sessions for their organisation'
  ) then
    create policy "Users can delete booking sessions for their organisation"
      on public.booking_sessions
      for delete
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = booking_sessions.organisation_id
        )
      );
  end if;
end $$;
