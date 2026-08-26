-- 019_hide_event_qr_tokens.sql
--
-- DO NOT RUN THIS UNTIL A BUILD CONTAINING THE MATCHING APP CHANGE IS INSTALLED.
-- PostgREST raises "permission denied for column" rather than silently omitting a
-- revoked column, so any client still issuing select("*") against events will fail
-- outright - which would break the events tab for every member on an older build.
-- lib/events.ts and lib/admin.ts now request explicit column lists.
--
-- The events select policy is:
--   create policy "active events readable" on public.events
--     for select using (is_active = true or public.is_admin(auth.uid()));
--
-- That is row-level, so every column of an active event - including qr_code_token -
-- is readable by any signed-in member. Verified on 2026-08-25: a role='member' account
-- listed the check-in token of every event straight from the REST API. The token is the
-- only thing standing between "attended" and "claimed the points from home", so this
-- defeats the purpose of QR check-in entirely. Column privileges are the right tool
-- here; RLS cannot express it.
--
-- check_in_event still reads the column: it is security definer and executes as the
-- owner, which retains the grant.

revoke select (qr_code_token) on public.events from anon, authenticated;

-- Admins still need the token to render and print the QR codes.
create or replace function public.admin_event_qr_tokens()
returns table(event_id uuid, qr_code_token text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin required';
  end if;
  return query select e.id, e.qr_code_token from public.events e;
end;
$$;

revoke execute on function public.admin_event_qr_tokens() from public, anon;
grant execute on function public.admin_event_qr_tokens() to authenticated;
