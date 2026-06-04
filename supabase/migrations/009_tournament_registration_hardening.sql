create or replace function public.register_for_tournament(p_tournament_id uuid)
returns table(status text, registration_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  tournament_row public.tournaments%rowtype;
  registration uuid;
  registration_count int;
  current_points int;
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
    return query select 'already_registered', null::uuid;
    return;
  end if;

  select count(*) into registration_count
  from public.tournament_registrations
  where tournament_id = p_tournament_id and tournament_registrations.status = 'registered';
  if registration_count >= tournament_row.max_players then
    raise exception 'Tournament is full';
  end if;

  select total_points into current_points
  from public.profiles
  where id = auth.uid()
  for update;

  if current_points is null then
    raise exception 'Profile not found';
  end if;

  if tournament_row.entry_cost_points is not null and tournament_row.entry_cost_points > 0 and current_points < tournament_row.entry_cost_points then
    raise exception 'Insufficient points: you have %, but this tournament costs %', current_points, tournament_row.entry_cost_points;
  end if;

  insert into public.tournament_registrations(tournament_id, user_id)
  values (p_tournament_id, auth.uid())
  returning id into registration;

  if tournament_row.entry_cost_points is not null and tournament_row.entry_cost_points > 0 then
    perform public.redeem_points(auth.uid(), tournament_row.entry_cost_points, 'Tournament entry: ' || tournament_row.title, 'tournament', registration);
  end if;

  return query select 'registered', registration;
end;
$$;
