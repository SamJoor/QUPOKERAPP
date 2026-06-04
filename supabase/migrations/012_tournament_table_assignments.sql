alter table public.profiles add column if not exists lifetime_points int not null default 0 check (lifetime_points >= 0);
alter table public.profiles add column if not exists spendable_points int not null default 0 check (spendable_points >= 0);

create table if not exists public.tournament_tables (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  table_number int not null check (table_number > 0),
  max_seats int not null default 8 check (max_seats between 2 and 10),
  created_at timestamptz not null default now(),
  unique (tournament_id, table_number)
);

create table if not exists public.tournament_table_seats (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  table_id uuid not null references public.tournament_tables(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat_number int not null check (seat_number > 0),
  created_at timestamptz not null default now(),
  unique (table_id, seat_number),
  unique (tournament_id, user_id),
  unique (registration_id)
);

create index if not exists tournament_tables_tournament_idx on public.tournament_tables(tournament_id, table_number);
create index if not exists tournament_table_seats_tournament_idx on public.tournament_table_seats(tournament_id, table_id, seat_number);

alter table public.tournament_tables enable row level security;
alter table public.tournament_table_seats enable row level security;

drop policy if exists "tournament tables readable" on public.tournament_tables;
create policy "tournament tables readable" on public.tournament_tables for select using (true);

drop policy if exists "tournament table seats readable" on public.tournament_table_seats;
create policy "tournament table seats readable" on public.tournament_table_seats for select using (true);

drop policy if exists "tournament tables admin all" on public.tournament_tables;
create policy "tournament tables admin all" on public.tournament_tables for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "tournament table seats admin all" on public.tournament_table_seats;
create policy "tournament table seats admin all" on public.tournament_table_seats for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create or replace function public.assign_tournament_seat(
  p_tournament_id uuid,
  p_registration_id uuid,
  p_user_id uuid,
  p_table_size int default 8
)
returns table(table_number int, seat_number int)
language plpgsql security definer set search_path = public as $$
declare
  selected_table public.tournament_tables%rowtype;
  next_table_number int;
  next_seat int;
  table_size int := least(greatest(coalesce(p_table_size, 8), 2), 10);
begin
  select tt.* into selected_table
  from public.tournament_tables tt
  where tt.tournament_id = p_tournament_id
    and (select count(*) from public.tournament_table_seats s where s.table_id = tt.id) < tt.max_seats
  order by (select count(*) from public.tournament_table_seats s where s.table_id = tt.id) asc, tt.table_number asc
  limit 1
  for update skip locked;

  if selected_table.id is null then
    select coalesce(max(tt.table_number), 0) + 1 into next_table_number
    from public.tournament_tables tt
    where tt.tournament_id = p_tournament_id;

    insert into public.tournament_tables(tournament_id, table_number, max_seats)
    values (p_tournament_id, next_table_number, table_size)
    returning * into selected_table;
  end if;

  select seat into next_seat
  from generate_series(1, selected_table.max_seats) as seats(seat)
  where not exists (
    select 1 from public.tournament_table_seats s
    where s.table_id = selected_table.id and s.seat_number = seat
  )
  order by seat
  limit 1;

  if next_seat is null then
    raise exception 'No seats available at selected table';
  end if;

  insert into public.tournament_table_seats(tournament_id, table_id, registration_id, user_id, seat_number)
  values (p_tournament_id, selected_table.id, p_registration_id, p_user_id, next_seat)
  on conflict (tournament_id, user_id) do nothing;

  return query
  select tt.table_number as assigned_table_number, s.seat_number as assigned_seat_number
  from public.tournament_table_seats s
  join public.tournament_tables tt on tt.id = s.table_id
  where s.tournament_id = p_tournament_id and s.user_id = p_user_id;
end;
$$;

drop function if exists public.register_for_tournament(uuid);

create or replace function public.register_for_tournament(p_tournament_id uuid)
returns table(status text, registration_id uuid, table_number int, seat_number int)
language plpgsql security definer set search_path = public as $$
declare
  tournament_row public.tournaments%rowtype;
  registration uuid;
  registration_count int;
  current_spendable int;
  assignment record;
  existing_table_number int;
  existing_seat_number int;
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

  select r.id, s.table_number, s.seat_number
  into registration, existing_table_number, existing_seat_number
  from public.tournament_registrations r
  left join (
    select seats.registration_id, tables.table_number, seats.seat_number
    from public.tournament_table_seats seats
    join public.tournament_tables tables on tables.id = seats.table_id
  ) s on s.registration_id = r.id
  where r.tournament_id = p_tournament_id and r.user_id = auth.uid();

  if registration is not null then
    if existing_table_number is null then
      select * into assignment from public.assign_tournament_seat(p_tournament_id, registration, auth.uid(), 8);
      existing_table_number := assignment.table_number;
      existing_seat_number := assignment.seat_number;
    end if;
    return query select 'already_registered'::text, registration, existing_table_number::int, existing_seat_number::int;
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
    values (auth.uid(), -tournament_row.entry_cost_points, 'Tournament entry: ' || tournament_row.title, 'tournament', registration, auth.uid());

    update public.profiles
    set spendable_points = spendable_points - tournament_row.entry_cost_points
    where id = auth.uid();
  end if;

  select * into assignment from public.assign_tournament_seat(p_tournament_id, registration, auth.uid(), 8);

  return query select 'registered'::text, registration, assignment.table_number::int, assignment.seat_number::int;
end;
$$;

drop function if exists public.get_tournament_registrations_public(uuid);

create or replace function public.get_tournament_registrations_public(p_tournament_id uuid)
returns table(user_id uuid, full_name text, status text, table_number int, seat_number int, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.user_id, p.full_name, r.status, tt.table_number as assigned_table_number, s.seat_number as assigned_seat_number, r.created_at
  from public.tournament_registrations r
  join public.profiles p on p.id = r.user_id
  left join public.tournament_table_seats s on s.registration_id = r.id
  left join public.tournament_tables tt on tt.id = s.table_id
  where r.tournament_id = p_tournament_id
  order by coalesce(tt.table_number, 999), coalesce(s.seat_number, 999), r.created_at asc;
$$;

drop function if exists public.get_tournament_table_seats(uuid);

create or replace function public.get_tournament_table_seats(p_tournament_id uuid)
returns table(
  table_id uuid,
  table_number int,
  max_seats int,
  seat_number int,
  user_id uuid,
  full_name text,
  status text
)
language sql stable security definer set search_path = public as $$
  select tt.id as table_id, tt.table_number as assigned_table_number, tt.max_seats, s.seat_number as assigned_seat_number, s.user_id, p.full_name, r.status
  from public.tournament_table_seats s
  join public.tournament_tables tt on tt.id = s.table_id
  join public.tournament_registrations r on r.id = s.registration_id
  join public.profiles p on p.id = s.user_id
  where s.tournament_id = p_tournament_id
  order by tt.table_number asc, s.seat_number asc;
$$;

do $$
declare
  registration_row record;
begin
  for registration_row in
    select r.id, r.tournament_id, r.user_id
    from public.tournament_registrations r
    where not exists (
      select 1 from public.tournament_table_seats s where s.registration_id = r.id
    )
    order by r.tournament_id, r.created_at
  loop
    perform public.assign_tournament_seat(registration_row.tournament_id, registration_row.id, registration_row.user_id, 8);
  end loop;
end $$;
