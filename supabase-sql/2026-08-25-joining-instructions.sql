-- Joining instructions feature for Hercules OS.
-- Run this in the Supabase SQL Editor only after reviewing it.
-- Adds reusable joining instruction templates and booking-level fields.

create extension if not exists pgcrypto;

create table if not exists public.joining_instruction_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  subject text not null,
  body text not null,
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.joining_instruction_templates
  add column if not exists organisation_id uuid;

alter table public.joining_instruction_templates
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.joining_instruction_templates
  add column if not exists name text;

alter table public.joining_instruction_templates
  add column if not exists subject text;

alter table public.joining_instruction_templates
  add column if not exists body text;

alter table public.joining_instruction_templates
  add column if not exists is_default boolean not null default false;

alter table public.joining_instruction_templates
  add column if not exists archived_at timestamptz;

alter table public.joining_instruction_templates
  add column if not exists created_at timestamptz not null default now();

alter table public.joining_instruction_templates
  add column if not exists updated_at timestamptz not null default now();

alter table public.bookings
  add column if not exists joining_instruction_template_id uuid
    references public.joining_instruction_templates(id) on delete set null;

alter table public.bookings
  add column if not exists joining_instruction_subject text;

alter table public.bookings
  add column if not exists joining_instruction_body text;

alter table public.bookings
  add column if not exists joining_instructions_sent_at timestamptz;

create unique index if not exists joining_instruction_templates_one_default_per_org
  on public.joining_instruction_templates (organisation_id)
  where is_default = true
    and archived_at is null;

create index if not exists joining_instruction_templates_organisation_idx
  on public.joining_instruction_templates (organisation_id);

create index if not exists joining_instruction_templates_active_idx
  on public.joining_instruction_templates (organisation_id, archived_at, name);

create index if not exists bookings_joining_instruction_template_idx
  on public.bookings (joining_instruction_template_id);

create index if not exists bookings_joining_instructions_auto_send_idx
  on public.bookings (organisation_id, date, status, joining_instructions_sent_at);

insert into public.joining_instruction_templates (
  organisation_id,
  name,
  subject,
  body,
  is_default
)
select
  organisations.id,
  'Default joining instructions',
  'Joining instructions for {{course_name}} on {{booking_date}}',
  'Hello {{delegate_name}},

We are looking forward to welcoming you to {{course_name}} on {{booking_date}}.

Course time: {{booking_start_time}} to {{booking_end_time}}
Venue: {{booking_location}}
Trainer: {{trainer_name}}

Please arrive a few minutes before the course start time so we can begin promptly.

What to bring:
- Any identification or paperwork requested by your employer or course organiser
- Something to take notes with
- Any course-specific items already agreed with us

If you are unsure about parking, access, refreshments, or anything else before the course, please contact {{organisation_name}}.

Contact:
{{organisation_email}}
{{organisation_phone}}

Kind regards,
{{organisation_name}}',
  true
from public.organisations
where not exists (
  select 1
  from public.joining_instruction_templates existing
  where existing.organisation_id = organisations.id
    and existing.archived_at is null
);

alter table public.joining_instruction_templates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'joining_instruction_templates'
      and policyname = 'Users can view joining instruction templates for their organisation'
  ) then
    create policy "Users can view joining instruction templates for their organisation"
      on public.joining_instruction_templates
      for select
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = joining_instruction_templates.organisation_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'joining_instruction_templates'
      and policyname = 'Users can create joining instruction templates for their organisation'
  ) then
    create policy "Users can create joining instruction templates for their organisation"
      on public.joining_instruction_templates
      for insert
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = joining_instruction_templates.organisation_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'joining_instruction_templates'
      and policyname = 'Users can update joining instruction templates for their organisation'
  ) then
    create policy "Users can update joining instruction templates for their organisation"
      on public.joining_instruction_templates
      for update
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = joining_instruction_templates.organisation_id
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = joining_instruction_templates.organisation_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'joining_instruction_templates'
      and policyname = 'Users can delete joining instruction templates for their organisation'
  ) then
    create policy "Users can delete joining instruction templates for their organisation"
      on public.joining_instruction_templates
      for delete
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organisation_id = joining_instruction_templates.organisation_id
        )
      );
  end if;
end $$;
