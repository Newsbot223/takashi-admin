-- Order history cleanup: count + delete final-status orders before a date.
--
-- Context: staff want to clear out old completed/cancelled orders from
-- the Admin Panel. All order data is also mirrored in Telegram, so no
-- archive is needed — this is a real DELETE, not a soft-delete/flag.
--
-- SAFETY:
-- - Only orders whose status is terminal (public.order_statuses.is_terminal)
--   are ever eligible — currently 'delivered' and 'cancelled', read from
--   the reference table rather than hardcoded, so this stays correct if
--   the terminal set ever changes without touching this function.
-- - "before <date>" is evaluated in Europe/Berlin local time, not UTC —
--   p_before_date::timestamp at time zone 'Europe/Berlin' converts the
--   plain calendar date the UI sends into the correct absolute instant
--   for comparison against orders.created_at (timestamptz), so a date
--   picked in the admin UI can't accidentally include/exclude orders
--   from the boundary day due to UTC/Berlin offset.
-- - Both functions require is_staff() — same authorization already used
--   by update_order_status / update_order_details, no new auth model.
-- - orders is the parent of order_items, order_status_history,
--   order_edit_log and notifications_log, all four via
--   ON DELETE CASCADE (verified against the live schema before writing
--   this migration) — a single DELETE FROM orders cleans up all four
--   automatically, no manual per-table deletes needed.
-- - customers, staff, order_statuses, status_transitions and every other
--   reference/CRM table are never touched.
-- - order_status_email_notifications is NOT foreign-keyed to orders (it
--   keys on order_number, a plain text column, on purpose — see that
--   migration), so it does not cascade; clear_order_history removes the
--   matching rows there too in the same transaction, purely for
--   tidiness (an orphaned dedup-claim row is harmless either way).
--
-- Nothing here sends email, Telegram, or any other notification — this
-- is a pure administrative delete, matching the requirement that
-- clearing history must never trigger customer-facing side effects.

begin;

create or replace function public.count_orders_for_history_cleanup(p_before_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Not authorized to view order history';
  end if;

  if p_before_date is null then
    raise exception 'p_before_date is required';
  end if;

  return (
    select count(*)::int
    from public.orders o
    where o.created_at < (p_before_date::timestamp at time zone 'Europe/Berlin')
      and o.status in (select key from public.order_statuses where is_terminal)
  );
end;
$$;

create or replace function public.clear_order_history(p_before_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count int;
  v_deleted_numbers text[];
begin
  if not public.is_staff() then
    raise exception 'Not authorized to clear order history';
  end if;

  if p_before_date is null then
    raise exception 'p_before_date is required';
  end if;

  with deleted as (
    delete from public.orders o
    where o.created_at < (p_before_date::timestamp at time zone 'Europe/Berlin')
      and o.status in (select key from public.order_statuses where is_terminal)
    returning o.order_number
  )
  select count(*)::int, coalesce(array_agg(order_number), '{}')
  into v_deleted_count, v_deleted_numbers
  from deleted;

  if v_deleted_count > 0 then
    delete from public.order_status_email_notifications
    where order_number = any (v_deleted_numbers);
  end if;

  return v_deleted_count;
end;
$$;

revoke all on function public.count_orders_for_history_cleanup(date) from public;
grant execute on function public.count_orders_for_history_cleanup(date) to authenticated;

revoke all on function public.clear_order_history(date) from public;
grant execute on function public.clear_order_history(date) to authenticated;

commit;
