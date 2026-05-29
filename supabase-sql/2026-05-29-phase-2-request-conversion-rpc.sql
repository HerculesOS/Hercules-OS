-- Phase 2 request conversion RPC for Hercules OS.
-- Run this in the Supabase SQL Editor only after reviewing it.
-- It converts a training request to a booking inside one transaction.
-- Public/open-course requests create a public booking with no main client.
-- Private/in-house requests create or reuse the requesting company as the booking client.

create or replace function public.convert_training_request_to_booking(
  p_request_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_profile profiles%rowtype;
  selected_request training_requests%rowtype;
  existing_client clients%rowtype;
  request_type text;
  request_notes text;
  booking_notes text;
  selected_client_id uuid := null;
  selected_client_name text := null;
  new_booking_id uuid;
begin
  select *
  into current_profile
  from profiles
  where id = auth.uid();

  if current_profile.id is null then
    raise exception 'User profile not found';
  end if;

  select *
  into selected_request
  from training_requests
  where id = p_request_id
    and organisation_id = current_profile.organisation_id
  for update;

  if selected_request.id is null then
    raise exception 'Training request not found';
  end if;

  if selected_request.status = 'converted' then
    raise exception 'This request has already been converted';
  end if;

  if selected_request.preferred_date is null then
    raise exception 'This request has no preferred date. Add a date to the booking manually or update the request first.';
  end if;

  request_notes := lower(coalesce(selected_request.notes, ''));

  if request_notes like '%public/open course enquiry%'
    or request_notes like '%public / open course%'
    or request_notes like '%public course%'
    or request_notes like '%open course%' then
    request_type := 'public';
  else
    request_type := 'private';
  end if;

  booking_notes := concat_ws(
    E'\n',
    'Created from public request.',
    case
      when request_type = 'public' then 'Request type: Public / open course'
      else 'Request type: Private / in-house'
    end,
    case
      when selected_request.learner_count is not null
        then 'Learners requested: ' || selected_request.learner_count::text
      else null
    end,
    case
      when nullif(trim(coalesce(selected_request.notes, '')), '') is not null
        then 'Request notes: ' || trim(selected_request.notes)
      else null
    end,
    'Requester: ' || concat_ws(
      ', ',
      nullif(trim(coalesce(selected_request.company_name, '')), ''),
      nullif(trim(coalesce(selected_request.contact_name, '')), ''),
      nullif(trim(coalesce(selected_request.email, '')), ''),
      nullif(trim(coalesce(selected_request.phone, '')), '')
    )
  );

  if request_type = 'private' then
    if nullif(trim(coalesce(selected_request.company_name, '')), '') is not null then
      select *
      into existing_client
      from clients
      where organisation_id = current_profile.organisation_id
        and company ilike trim(selected_request.company_name)
      order by created_at asc
      limit 1;
    end if;

    if existing_client.id is null then
      insert into clients (
        user_id,
        organisation_id,
        company,
        name,
        email,
        phone,
        address,
        notes
      )
      values (
        auth.uid(),
        current_profile.organisation_id,
        coalesce(nullif(trim(selected_request.company_name), ''), 'Unnamed company'),
        coalesce(nullif(trim(selected_request.contact_name), ''), 'Primary contact'),
        coalesce(selected_request.email, ''),
        coalesce(selected_request.phone, ''),
        coalesce(selected_request.location, ''),
        concat_ws(
          E'\n',
          case
            when nullif(trim(coalesce(selected_request.notes, '')), '') is not null
              then 'Request notes: ' || trim(selected_request.notes)
            else null
          end,
          'Original request type: Private / in-house'
        )
      )
      returning * into existing_client;
    end if;

    selected_client_id := existing_client.id;
    selected_client_name := coalesce(existing_client.company, existing_client.name);
  else
    selected_client_id := null;
    selected_client_name := 'Public course';
  end if;

  insert into bookings (
    user_id,
    organisation_id,
    course_delivery_type,
    client_id,
    trainer_id,
    client_name,
    course_name,
    date,
    start_time,
    end_time,
    location,
    price,
    notes,
    status
  )
  values (
    auth.uid(),
    current_profile.organisation_id,
    request_type,
    selected_client_id,
    null,
    selected_client_name,
    coalesce(nullif(trim(selected_request.course_name), ''), 'Training course'),
    selected_request.preferred_date,
    null,
    null,
    coalesce(selected_request.location, ''),
    null,
    booking_notes,
    'scheduled'
  )
  returning id into new_booking_id;

  update training_requests
  set status = 'converted'
  where id = selected_request.id;

  return new_booking_id;
end;
$$;
