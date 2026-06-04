create extension if not exists pgcrypto;

create type public.app_role as enum ('member', 'admin');
create type public.event_type as enum ('meeting', 'tournament', 'philanthropy', 'social', 'workshop');
create type public.points_source_type as enum ('attendance', 'philanthropy', 'tournament', 'admin_adjustment', 'reward_redemption', 'daily_practice', 'bonus');
create type public.reward_type as enum ('tournament_entry', 'round_boost', 'gift_card', 'custom_chip', 'merch', 'recognition');
create type public.redemption_status as enum ('pending', 'approved', 'fulfilled', 'cancelled');
create type public.tournament_status as enum ('upcoming', 'registration_open', 'in_progress', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  student_id text,
  graduation_year int,
  major text,
  avatar_url text,
  role public.app_role not null default 'member',
  total_points int not null default 0 check (total_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  event_type public.event_type not null,
  points_awarded int not null default 0 check (points_awarded >= 0),
  qr_code_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method text not null default 'qr' check (method = 'qr'),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points int not null check (points <> 0),
  reason text not null,
  source_type public.points_source_type not null,
  source_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  cost_points int not null check (cost_points > 0),
  reward_type public.reward_type not null,
  image_url text,
  stock int check (stock is null or stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points_spent int not null check (points_spent > 0),
  status public.redemption_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  starts_at timestamptz not null,
  max_players int not null check (max_players > 1),
  entry_cost_points int check (entry_cost_points is null or entry_cost_points >= 0),
  reward_points_first int not null default 0,
  reward_points_second int not null default 0,
  reward_points_third int not null default 0,
  status public.tournament_status not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered',
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table public.tournament_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  placement int not null check (placement > 0),
  points_awarded int not null default 0,
  created_at timestamptz not null default now(),
  unique (tournament_id, placement),
  unique (tournament_id, user_id)
);

create table public.daily_practice_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_date date not null default current_date,
  points_awarded int not null default 10 check (points_awarded > 0),
  created_at timestamptz not null default now(),
  unique (user_id, claim_date)
);

create index profiles_total_points_idx on public.profiles(total_points desc);
create index events_starts_at_idx on public.events(starts_at);
create index events_qr_code_token_idx on public.events(qr_code_token);
create index attendance_user_id_idx on public.attendance(user_id);
create index attendance_event_id_idx on public.attendance(event_id);
create index points_ledger_user_id_created_at_idx on public.points_ledger(user_id, created_at desc);
create index reward_redemptions_user_id_idx on public.reward_redemptions(user_id);
create index tournament_registrations_user_id_idx on public.tournament_registrations(user_id);
create index daily_practice_user_date_idx on public.daily_practice_claims(user_id, claim_date);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger rewards_touch before update on public.rewards for each row execute function public.touch_updated_at();
create trigger reward_redemptions_touch before update on public.reward_redemptions for each row execute function public.touch_updated_at();
create trigger tournaments_touch before update on public.tournaments for each row execute function public.touch_updated_at();

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = user_id and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.award_points(
  p_user_id uuid,
  p_points int,
  p_reason text,
  p_source_type public.points_source_type,
  p_source_id uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_points <= 0 then raise exception 'Points awarded must be positive'; end if;
  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  if p_source_type = 'admin_adjustment' and not public.is_admin(auth.uid()) then raise exception 'Admin required'; end if;

  insert into public.points_ledger(user_id, points, reason, source_type, source_id, created_by)
  values (p_user_id, p_points, p_reason, p_source_type, p_source_id, auth.uid());

  update public.profiles set total_points = total_points + p_points where id = p_user_id;
end;
$$;

create or replace function public.redeem_points(
  p_user_id uuid,
  p_points int,
  p_reason text,
  p_source_type public.points_source_type,
  p_source_id uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
declare current_points int;
begin
  if p_points <= 0 then raise exception 'Points redeemed must be positive'; end if;
  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;

  select total_points into current_points from public.profiles where id = p_user_id for update;
  if current_points < p_points then raise exception 'Insufficient points'; end if;

  insert into public.points_ledger(user_id, points, reason, source_type, source_id, created_by)
  values (p_user_id, -p_points, p_reason, p_source_type, p_source_id, auth.uid());

  update public.profiles set total_points = total_points - p_points where id = p_user_id;
end;
$$;

create or replace function public.check_in_event(p_qr_code_token text)
returns table(status text, event_title text, points_awarded int)
language plpgsql security definer set search_path = public as $$
declare event_row public.events%rowtype;
begin
  select * into event_row from public.events where qr_code_token = p_qr_code_token and is_active = true and ends_at >= now();
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

  perform public.award_points(auth.uid(), event_row.points_awarded, 'Checked into ' || event_row.title, 'attendance', event_row.id);
  return query select 'success', event_row.title, event_row.points_awarded;
end;
$$;

create or replace function public.redeem_reward(p_reward_id uuid)
returns table(status text, redemption_id uuid)
language plpgsql security definer set search_path = public as $$
declare reward_row public.rewards%rowtype;
declare new_redemption_id uuid;
begin
  select * into reward_row from public.rewards where id = p_reward_id and is_active = true for update;
  if not found then raise exception 'Reward unavailable'; end if;
  if reward_row.stock is not null and reward_row.stock <= 0 then raise exception 'Reward out of stock'; end if;

  insert into public.reward_redemptions(reward_id, user_id, points_spent)
  values (reward_row.id, auth.uid(), reward_row.cost_points)
  returning id into new_redemption_id;

  perform public.redeem_points(auth.uid(), reward_row.cost_points, 'Redeemed reward: ' || reward_row.title, 'reward_redemption', new_redemption_id);

  if reward_row.stock is not null then
    update public.rewards set stock = stock - 1 where id = reward_row.id;
  end if;

  return query select 'pending', new_redemption_id;
end;
$$;

create or replace function public.claim_daily_practice()
returns table(status text, points_awarded int)
language plpgsql security definer set search_path = public as $$
begin
  insert into public.daily_practice_claims(user_id, claim_date, points_awarded)
  values (auth.uid(), current_date, 10)
  on conflict (user_id, claim_date) do nothing;

  if not found then
    return query select 'duplicate', 0;
    return;
  end if;

  perform public.award_points(auth.uid(), 10, 'Daily strategy trainer practice', 'daily_practice', null);
  return query select 'success', 10;
end;
$$;

create or replace function public.register_for_tournament(p_tournament_id uuid)
returns table(status text, registration_id uuid)
language plpgsql security definer set search_path = public as $$
declare tournament_row public.tournaments%rowtype;
declare registration uuid;
begin
  select * into tournament_row from public.tournaments where id = p_tournament_id for update;
  if not found or tournament_row.status <> 'registration_open' then raise exception 'Registration is not open'; end if;

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

create or replace function public.get_monthly_leaderboard()
returns table(user_id uuid, full_name text, avatar_url text, total_points bigint, rank bigint)
language sql stable security definer set search_path = public as $$
  with totals as (
    select p.id, p.full_name, p.avatar_url, coalesce(sum(l.points), 0) as points
    from public.profiles p
    left join public.points_ledger l on l.user_id = p.id and l.created_at >= date_trunc('month', now())
    group by p.id, p.full_name, p.avatar_url
  )
  select id, full_name, avatar_url, points, dense_rank() over(order by points desc)
  from totals
  order by points desc
  limit 50;
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;
alter table public.points_ledger enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.tournament_results enable row level security;
alter table public.daily_practice_claims enable row level security;

create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles safe self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()) and total_points = (select total_points from public.profiles where id = auth.uid()));
create policy "profiles admin all" on public.profiles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "active events readable" on public.events for select using (is_active = true or public.is_admin(auth.uid()));
create policy "events admin all" on public.events for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "attendance own read" on public.attendance for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "attendance admin all" on public.attendance for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "ledger own read" on public.points_ledger for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "ledger admin read" on public.points_ledger for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "active rewards readable" on public.rewards for select using (is_active = true or public.is_admin(auth.uid()));
create policy "rewards admin all" on public.rewards for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "redemptions own read" on public.reward_redemptions for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "redemptions admin all" on public.reward_redemptions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "tournaments readable" on public.tournaments for select using (true);
create policy "tournaments admin all" on public.tournaments for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "registrations own read" on public.tournament_registrations for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "registrations admin all" on public.tournament_registrations for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "results readable" on public.tournament_results for select using (true);
create policy "results admin all" on public.tournament_results for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "practice own read" on public.daily_practice_claims for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "practice admin all" on public.daily_practice_claims for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
