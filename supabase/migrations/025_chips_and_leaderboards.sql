-- 025_chips_and_leaderboards.sql
--
-- Splits the two currencies that migration 022 accidentally merged.
--
-- 022 set spendable_points to 2000 for everyone so the offline table had a buy-in. But
-- spendable_points is club currency: 010 deducts it on reward redemption and 011/012 on
-- tournament entry. Every member was holding 2000 points of redeemable club perks they had
-- not earned.
--
--   chips            in-game currency for games in the app. Granted, never earned at events.
--   spendable_points club currency. Earned by attending events, spent on rewards and entries.
--
-- Chips start at 2000 and grow by 500 a day on claim. spendable_points goes back to 0 so the
-- club ledger is honest again - nobody has attended an event yet.

alter table public.profiles
  add column if not exists chips int not null default 2000 check (chips >= 0);

alter table public.profiles alter column spendable_points set default 0;

update public.profiles
set chips = greatest(chips, 2000),
    spendable_points = 0,
    updated_at = now();

create index if not exists profiles_chips_idx on public.profiles(chips desc);

-- New members get the same 2000 opening balance and no club points.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, chips, spendable_points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    2000,
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Daily chip top-up. Separate from daily_practice_claims, which awards club points for the
-- strategy trainer and means something different.
create table if not exists public.daily_chip_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_date date not null default current_date,
  chips_awarded int not null default 500 check (chips_awarded > 0),
  created_at timestamptz not null default now(),
  unique (user_id, claim_date)
);

create index if not exists daily_chip_claims_user_date_idx
  on public.daily_chip_claims(user_id, claim_date desc);

alter table public.daily_chip_claims enable row level security;

drop policy if exists "chip claims own read" on public.daily_chip_claims;
create policy "chip claims own read" on public.daily_chip_claims
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- Awards once per calendar day. The unique constraint is what enforces it, so two taps in
-- the same second cannot both pay out.
create or replace function public.claim_daily_chips()
returns table(status text, chips_awarded int, chip_balance int)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  award int := 500;
  balance int;
begin
  if me is null then raise exception 'Authentication required'; end if;

  insert into public.daily_chip_claims(user_id, claim_date, chips_awarded)
  values (me, current_date, award)
  on conflict (user_id, claim_date) do nothing;

  if not found then
    select p.chips into balance from public.profiles p where p.id = me;
    return query select 'already_claimed'::text, 0, coalesce(balance, 0);
    return;
  end if;

  update public.profiles
  set chips = chips + award, updated_at = now()
  where id = me
  returning chips into balance;

  return query select 'success'::text, award, balance;
end;
$$;

-- Whether today's top-up is still available, so the UI can show the right state without
-- attempting a claim.
create or replace function public.daily_chips_available()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
    and not exists (
      select 1 from public.daily_chip_claims
      where user_id = auth.uid() and claim_date = current_date
    );
$$;

-- Chip standings. Same shape as the club point leaderboards so the client can share a type.
create or replace function public.get_chip_leaderboard()
returns table(user_id uuid, full_name text, avatar_url text, avatar_key text, total_points bigint, rank bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.avatar_key, p.chips::bigint,
         dense_rank() over(order by p.chips desc)
  from public.profiles p
  order by p.chips desc
  limit 100;
$$;

-- Club points earned in the last seven days, from the ledger rather than the running total.
create or replace function public.get_weekly_leaderboard()
returns table(user_id uuid, full_name text, avatar_url text, avatar_key text, total_points bigint, rank bigint)
language sql stable security definer set search_path = public as $$
  with totals as (
    select p.id, p.full_name, p.avatar_url, p.avatar_key,
           coalesce(sum(l.points) filter (where l.points > 0), 0) as points
    from public.profiles p
    left join public.points_ledger l
      on l.user_id = p.id and l.created_at >= now() - interval '7 days'
    group by p.id, p.full_name, p.avatar_url, p.avatar_key
  )
  select id, full_name, avatar_url, avatar_key, points, dense_rank() over(order by points desc)
  from totals
  order by points desc
  limit 100;
$$;

revoke all on function public.claim_daily_chips() from public, anon;
revoke all on function public.daily_chips_available() from public, anon;
revoke all on function public.get_chip_leaderboard() from public, anon;
revoke all on function public.get_weekly_leaderboard() from public, anon;
grant execute on function public.claim_daily_chips() to authenticated;
grant execute on function public.daily_chips_available() to authenticated;
grant execute on function public.get_chip_leaderboard() to authenticated;
grant execute on function public.get_weekly_leaderboard() to authenticated;
