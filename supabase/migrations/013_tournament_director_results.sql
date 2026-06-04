create or replace function public.submit_tournament_result(
  p_tournament_id uuid,
  p_user_id uuid,
  p_placement int,
  p_points_awarded int
)
returns void language plpgsql security definer set search_path = public as $$
declare
  existing_for_user public.tournament_results%rowtype;
  placement_taken_by uuid;
  points_delta int;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  if p_placement <= 0 then raise exception 'Placement must be positive'; end if;
  if p_points_awarded < 0 then raise exception 'Awarded points cannot be negative'; end if;

  if not exists (
    select 1 from public.tournament_registrations tr
    where tr.tournament_id = p_tournament_id
      and tr.user_id = p_user_id
      and tr.status = 'registered'
  ) then
    raise exception 'Member must be registered before receiving a placement';
  end if;

  select tr.user_id into placement_taken_by
  from public.tournament_results tr
  where tr.tournament_id = p_tournament_id
    and tr.placement = p_placement
    and tr.user_id <> p_user_id;

  if placement_taken_by is not null then
    raise exception 'Placement #% is already assigned to another member', p_placement;
  end if;

  select * into existing_for_user
  from public.tournament_results tr
  where tr.tournament_id = p_tournament_id and tr.user_id = p_user_id
  for update;

  if existing_for_user.id is null then
    insert into public.tournament_results(tournament_id, user_id, placement, points_awarded)
    values (p_tournament_id, p_user_id, p_placement, p_points_awarded);
    points_delta := p_points_awarded;
  else
    update public.tournament_results
    set placement = p_placement,
        points_awarded = p_points_awarded
    where id = existing_for_user.id;
    points_delta := greatest(p_points_awarded - existing_for_user.points_awarded, 0);
  end if;

  if points_delta > 0 then
    perform public.award_points(
      p_user_id,
      points_delta,
      'Tournament placement #' || p_placement,
      'tournament',
      p_tournament_id
    );
  end if;
end;
$$;
