create or replace function public.register_for_tournament(p_tournament_id uuid)
returns table(status text, registration_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  tournament_row public.tournaments%rowtype;
  registration uuid;
  registration_count int;
  current_spendable int;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into tournament_row from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;
  if tournament_row.status <> 'registration_open' then
    raise exception 'Registration is not open';
  end if;

  if exists (
    select 1 from public.tournament_registrations
    where tournament_id = p_tournament_id and user_id = auth.uid()
  ) then
    return query select 'already_registered'::text, null::uuid;
    return;
  end if;

  select count(*) into registration_count
  from public.tournament_registrations
  where tournament_id = p_tournament_id and tournament_registrations.status = 'registered';
  if registration_count >= tournament_row.max_players then
    raise exception 'Tournament is full';
  end if;

  select spendable_points into current_spendable
  from public.profiles
  where id = auth.uid()
  for update;

  if current_spendable is null then
    raise exception 'Profile not found';
  end if;

  if coalesce(tournament_row.entry_cost_points, 0) > 0 and current_spendable < tournament_row.entry_cost_points then
    raise exception 'Insufficient spendable points: you have %, but this tournament costs %', current_spendable, tournament_row.entry_cost_points;
  end if;

  insert into public.tournament_registrations(tournament_id, user_id, status)
  values (p_tournament_id, auth.uid(), 'registered')
  returning id into registration;

  if coalesce(tournament_row.entry_cost_points, 0) > 0 then
    insert into public.points_ledger(user_id, points, reason, source_type, source_id, created_by)
    values (
      auth.uid(),
      -tournament_row.entry_cost_points,
      'Tournament entry: ' || tournament_row.title,
      'tournament',
      registration,
      auth.uid()
    );

    update public.profiles
    set spendable_points = spendable_points - tournament_row.entry_cost_points
    where id = auth.uid();
  end if;

  return query select 'registered'::text, registration;
end;
$$;
