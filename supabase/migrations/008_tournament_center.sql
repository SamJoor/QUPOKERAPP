drop function if exists public.get_tournament_overview();

create or replace function public.get_tournament_overview()
returns table(
  id uuid,
  title text,
  description text,
  starts_at timestamptz,
  max_players int,
  entry_cost_points int,
  reward_points_first int,
  reward_points_second int,
  reward_points_third int,
  status public.tournament_status,
  created_at timestamptz,
  updated_at timestamptz,
  registered_count bigint,
  result_count bigint
)
language sql stable security definer set search_path = public as $$
  select
    t.id,
    t.title,
    t.description,
    t.starts_at,
    t.max_players,
    t.entry_cost_points,
    t.reward_points_first,
    t.reward_points_second,
    t.reward_points_third,
    t.status,
    t.created_at,
    t.updated_at,
    count(distinct r.id) filter (where r.status = 'registered') as registered_count,
    count(distinct tr.id) as result_count
  from public.tournaments t
  left join public.tournament_registrations r on r.tournament_id = t.id
  left join public.tournament_results tr on tr.tournament_id = t.id
  group by t.id
  order by
    case
      when t.status = 'registration_open' then 1
      when t.status = 'upcoming' then 2
      when t.status = 'in_progress' then 3
      when t.status = 'completed' then 4
      else 5
    end,
    t.starts_at asc;
$$;

drop function if exists public.get_tournament_results_public(uuid);

create or replace function public.get_tournament_results_public(p_tournament_id uuid)
returns table(user_id uuid, full_name text, placement int, points_awarded int, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.user_id, p.full_name, r.placement, r.points_awarded, r.created_at
  from public.tournament_results r
  join public.profiles p on p.id = r.user_id
  where r.tournament_id = p_tournament_id
  order by r.placement asc;
$$;
