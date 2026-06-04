do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles self insert'
  ) then
    create policy "profiles self insert" on public.profiles
    for insert with check (
      id = auth.uid()
      and role = 'member'
      and total_points = 0
    );
  end if;
end;
$$;

create or replace function public.get_all_time_leaderboard()
returns table(user_id uuid, full_name text, avatar_url text, total_points int, rank bigint)
language sql stable security definer set search_path = public as $$
  select id, full_name, avatar_url, total_points, dense_rank() over(order by total_points desc)
  from public.profiles
  order by total_points desc
  limit 50;
$$;

create or replace function public.check_in_event(p_qr_code_token text)
returns table(status text, event_title text, points_awarded int)
language plpgsql security definer set search_path = public as $$
declare event_row public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into event_row
  from public.events
  where qr_code_token = p_qr_code_token and is_active = true and ends_at >= now();

  if not found then
    return query select 'invalid', null::text, 0;
    return;
  end if;

  insert into public.attendance(event_id, user_id, method)
  values (event_row.id, auth.uid(), 'qr')
  on conflict (event_id, user_id) do nothing;

  if not found then
    return query select 'duplicate', event_row.title, event_row.points_awarded;
    return;
  end if;

  if event_row.points_awarded > 0 then
    perform public.award_points(auth.uid(), event_row.points_awarded, 'Checked into ' || event_row.title, 'attendance', event_row.id);
  end if;

  return query select 'success', event_row.title, event_row.points_awarded;
end;
$$;

create or replace function public.register_for_tournament(p_tournament_id uuid)
returns table(status text, registration_id uuid)
language plpgsql security definer set search_path = public as $$
declare tournament_row public.tournaments%rowtype;
declare registration uuid;
declare registration_count int;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into tournament_row from public.tournaments where id = p_tournament_id for update;
  if not found or tournament_row.status <> 'registration_open' then raise exception 'Registration is not open'; end if;

  select count(*) into registration_count
  from public.tournament_registrations
  where tournament_id = p_tournament_id and status = 'registered';
  if registration_count >= tournament_row.max_players then raise exception 'Tournament is full'; end if;

  insert into public.tournament_registrations(tournament_id, user_id)
  values (p_tournament_id, auth.uid())
  on conflict (tournament_id, user_id) do nothing
  returning id into registration;

  if registration is null then
    return query select 'already_registered', null::uuid;
    return;
  end if;

  if tournament_row.entry_cost_points is not null and tournament_row.entry_cost_points > 0 then
    perform public.redeem_points(auth.uid(), tournament_row.entry_cost_points, 'Tournament entry: ' || tournament_row.title, 'tournament', registration);
  end if;

  return query select 'registered', registration;
end;
$$;

create or replace function public.set_reward_redemption_status(
  p_redemption_id uuid,
  p_status public.redemption_status
)
returns void language plpgsql security definer set search_path = public as $$
declare redemption_row public.reward_redemptions%rowtype;
declare reward_title text;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin required'; end if;

  select * into redemption_row
  from public.reward_redemptions
  where id = p_redemption_id
  for update;
  if not found then raise exception 'Redemption not found'; end if;

  select title into reward_title from public.rewards where id = redemption_row.reward_id;

  if p_status = 'cancelled' and redemption_row.status <> 'cancelled' then
    perform public.award_points(
      redemption_row.user_id,
      redemption_row.points_spent,
      'Refunded cancelled reward: ' || coalesce(reward_title, redemption_row.reward_id::text),
      'reward_redemption',
      redemption_row.id
    );
  end if;

  update public.reward_redemptions
  set status = p_status
  where id = p_redemption_id;
end;
$$;

create or replace function public.submit_tournament_result(
  p_tournament_id uuid,
  p_user_id uuid,
  p_placement int,
  p_points_awarded int
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  if p_placement <= 0 then raise exception 'Placement must be positive'; end if;
  if p_points_awarded < 0 then raise exception 'Awarded points cannot be negative'; end if;

  insert into public.tournament_results(tournament_id, user_id, placement, points_awarded)
  values (p_tournament_id, p_user_id, p_placement, p_points_awarded);

  if p_points_awarded > 0 then
    perform public.award_points(
      p_user_id,
      p_points_awarded,
      'Tournament placement #' || p_placement,
      'tournament',
      p_tournament_id
    );
  end if;
end;
$$;
