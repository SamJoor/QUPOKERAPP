-- 018_lock_down_point_grants.sql
--
-- award_points guards only against granting points to SOMEONE ELSE:
--
--   if auth.uid() <> p_user_id and not public.is_admin(auth.uid())
--     then raise exception 'Not authorized'; end if;
--
-- Awarding to yourself is therefore allowed for every source_type except
-- 'admin_adjustment'. That allowance exists so the security-definer functions
-- (check_in_event, claim_daily_practice, submit_tournament_result) can credit the
-- calling user - but award_points is also directly callable over PostgREST, and the
-- anon key ships inside the app binary. Verified against this project on 2026-08-25:
-- a role='member' account granted itself 29,997 points in three requests.
--
-- Direct writes to points_ledger and profiles are already correctly blocked by RLS,
-- so this function is the only route. The fix is to stop end users calling it at all.
-- Internal callers are unaffected: a security-definer function executes as its owner,
-- and the owner keeps EXECUTE.

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, so revoking from authenticated
-- and anon alone would leave the hole open through the PUBLIC grant.
revoke execute on function public.award_points(uuid, int, text, public.points_source_type, uuid)
  from public, anon, authenticated;
revoke execute on function public.redeem_points(uuid, int, text, public.points_source_type, uuid)
  from public, anon, authenticated;

-- The admin points screen used award_points/redeem_points directly with
-- 'admin_adjustment'. It goes through this wrapper now, which is the only
-- point-moving entry point end users can reach.
create or replace function public.admin_adjust_points(
  p_user_id uuid,
  p_points int,
  p_reason text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin required';
  end if;
  if p_points = 0 then
    raise exception 'Points adjustment must be non-zero';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;

  if p_points > 0 then
    perform public.award_points(p_user_id, p_points, p_reason, 'admin_adjustment', null);
  else
    perform public.redeem_points(p_user_id, -p_points, p_reason, 'admin_adjustment', null);
  end if;
end;
$$;

revoke execute on function public.admin_adjust_points(uuid, int, text) from public, anon;
grant execute on function public.admin_adjust_points(uuid, int, text) to authenticated;
