-- Allow direct forward status transitions for orders.
--
-- Context: status_transitions currently only allows the strictly
-- sequential chain (new -> accepted -> cooking -> on_the_way -> delivered,
-- with cancel available from any non-terminal stage). Staff had to click
-- through every intermediate status even when the real-world order was
-- already further along. This migration adds the remaining forward-only
-- "skip ahead" edges so staff can jump directly to any later stage from
-- the admin panel. It never adds a backward edge and never creates a
-- cycle — stage order is strictly new < accepted < cooking < on_the_way
-- < delivered, and only i -> j pairs with i < j are added.
--
-- Rows verified present BEFORE this migration (read-only query run in
-- the Supabase SQL Editor on 2026-08-12, current production data):
--   accepted    -> cancelled
--   accepted    -> cooking
--   cooking     -> cancelled
--   cooking     -> on_the_way
--   new         -> accepted
--   new         -> cancelled
--   on_the_way  -> cancelled
--   on_the_way  -> delivered
--
-- Rows added by this migration:
--   new       -> cooking
--   new       -> on_the_way
--   new       -> delivered
--   accepted  -> on_the_way
--   accepted  -> delivered
--   cooking   -> delivered
--
-- cancelled and delivered stay terminal (no rows added with them as
-- from_status) — matches existing data, not changed here.
--
-- Idempotent: uses WHERE NOT EXISTS instead of ON CONFLICT, so it does
-- not depend on knowing the exact unique/PK constraint name on
-- status_transitions, and is safe to run more than once.

begin;

insert into public.status_transitions (from_status, to_status)
select v.from_status, v.to_status
from (
  values
    ('new',      'cooking'),
    ('new',      'on_the_way'),
    ('new',      'delivered'),
    ('accepted', 'on_the_way'),
    ('accepted', 'delivered'),
    ('cooking',  'delivered')
) as v(from_status, to_status)
where not exists (
  select 1
  from public.status_transitions st
  where st.from_status = v.from_status
    and st.to_status   = v.to_status
);

commit;
