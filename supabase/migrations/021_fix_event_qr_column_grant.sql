-- 021_fix_event_qr_column_grant.sql
--
-- Migration 019 did not work. It ran without error and changed nothing:
--
--   revoke select (qr_code_token) on public.events from anon, authenticated;
--
-- In PostgreSQL a column-level REVOKE only removes a column-level privilege. It does not
-- carve an exception out of a TABLE-level grant, and Supabase grants table-level SELECT on
-- public.events to anon and authenticated. With no column-level privilege present to
-- remove, that statement was a no-op - verified afterwards: a role='member' account could
-- still read qr_code_token.
--
-- The working form is to drop the table-level SELECT and grant back exactly the columns
-- that should be readable. RLS still applies on top of this; the policy
-- "active events readable" is unchanged.
--
-- admin_event_qr_tokens() from 019 is correct and already in place - admins read tokens
-- through it. check_in_event is security definer and executes as the owner, so it keeps
-- reading the column regardless of these grants.
--
-- SAFE TO RUN AFTER 019. Running it before a build with explicit column lists is installed
-- will break the events tab, because PostgREST errors on a column the caller cannot read
-- rather than omitting it. lib/events.ts and lib/admin.ts already name their columns.

revoke select on public.events from anon, authenticated;

grant select (
  id,
  title,
  description,
  event_type,
  location,
  starts_at,
  ends_at,
  points_awarded,
  is_active,
  created_by,
  created_at,
  updated_at
) on public.events to anon, authenticated;
