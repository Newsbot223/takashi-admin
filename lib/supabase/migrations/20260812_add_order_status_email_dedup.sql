-- Idempotency guard for status-change customer emails.
--
-- Context: status-change emails (accepted / on_the_way) are now sent
-- from two independent places: the Telegram bot's callback handler
-- (takashi-backend/api/order.js) and the new admin-panel notify
-- endpoint (takashi-backend/api/notify-status.js). Both are separate
-- Node/serverless processes with no shared memory, so the existing
-- in-memory dedup (messageStore.notifiedStatuses, best-effort only per
-- its own comment in order.js) cannot guarantee "at most one email" if
-- both fire for the same order + status at nearly the same time.
--
-- This table is a strict claim table, not an email log: whichever
-- caller's INSERT wins gets to send the email; the other caller's
-- INSERT is rejected by the primary key and it skips sending. Nothing
-- in this migration sends email — it is purely a concurrency-safe
-- claim; the actual send still happens in Node via the existing
-- notifyCustomer() / Resend path, unchanged.
--
-- AUTHORIZATION: claim_status_email_notification takes p_secret and
-- checks it against public.rpc_secrets.notification_secret — the exact
-- same secret and the exact same check already used by
-- get_order_for_notification (migration 017). Without this, anyone
-- holding the public anon key (shipped to browsers elsewhere in this
-- project) could call this RPC directly and pre-claim a specific
-- (order_number, status) row, causing the legitimate caller (Telegram
-- or Admin) to see "already claimed" and silently skip a real
-- customer's status email. Both callers on the Node side now pass
-- SUPABASE_RPC_SECRET explicitly, same as they already do for
-- get_order_for_notification.

begin;

create table if not exists public.order_status_email_notifications (
  order_number text not null,
  status       text not null,
  sent_at      timestamptz not null default now(),
  primary key (order_number, status)
);

-- RLS on with no policies: this table is reachable ONLY through the
-- SECURITY DEFINER function below. Neither the anon key nor an
-- authenticated staff session gets any direct grant on it — same
-- posture as customers/orders/order_items per the project's existing
-- "anon key has EXECUTE on functions only" rule.
alter table public.order_status_email_notifications enable row level security;

create or replace function public.claim_status_email_notification(
  p_order_number text,
  p_status       text,
  p_secret       text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_secret text;
begin
  -- Same secret, same table, same check as get_order_for_notification —
  -- deliberately not touching that function, just mirroring its guard
  -- here so this RPC can't be called anonymously by anyone holding only
  -- the public anon key.
  select value into v_expected_secret from public.rpc_secrets where key = 'notification_secret';
  if v_expected_secret is null or p_secret is distinct from v_expected_secret then
    raise exception 'Not authorized';
  end if;

  insert into public.order_status_email_notifications (order_number, status)
  values (p_order_number, p_status)
  on conflict (order_number, status) do nothing;

  -- FOUND reflects whether the INSERT above actually inserted a row.
  -- With ON CONFLICT DO NOTHING, a conflicting call inserts 0 rows, so
  -- FOUND is false for it. Postgres enforces the primary key
  -- atomically, so under two concurrent calls for the same
  -- (order_number, status) — e.g. Admin and Telegram firing at once —
  -- exactly one of them observes true here.
  return found;
end;
$$;

revoke all on function public.claim_status_email_notification(text, text, text) from public;
grant execute on function public.claim_status_email_notification(text, text, text) to anon;

commit;
