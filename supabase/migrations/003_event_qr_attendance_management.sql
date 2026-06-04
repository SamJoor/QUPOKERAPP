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
  where qr_code_token = p_qr_code_token
    and is_active = true
    and now() >= starts_at - interval '15 minutes'
    and now() <= ends_at;

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

create or replace function public.regenerate_event_qr(p_event_id uuid)
returns table(qr_code_token text)
language plpgsql security definer set search_path = public as $$
declare new_token text;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin required'; end if;

  new_token := encode(gen_random_bytes(24), 'hex');

  update public.events
  set qr_code_token = new_token
  where id = p_event_id
  returning events.qr_code_token into qr_code_token;

  if qr_code_token is null then raise exception 'Event not found'; end if;

  return next;
end;
$$;

create or replace function public.get_event_attendance(p_event_id uuid)
returns table(
  attendance_id uuid,
  user_id uuid,
  full_name text,
  email text,
  checked_in_at timestamptz,
  method text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.user_id, p.full_name, p.email, a.checked_in_at, a.method
  from public.attendance a
  join public.profiles p on p.id = a.user_id
  where a.event_id = p_event_id
    and public.is_admin(auth.uid())
  order by a.checked_in_at desc;
$$;
