-- 1) Compensating action for the new "Order ready — notify customer"
--    pickup button (api/notify-pickup-ready.js). That endpoint claims
--    (order_number, 'ready_for_pickup') BEFORE sending, same
--    claim-then-send pattern as the existing status-email dedup — but
--    unlike that flow (Telegram vs Admin race, must stay claimed even
--    on a downstream failure so a retry doesn't double-send), this
--    button has exactly one caller (the Admin Dashboard). Per the
--    explicit requirement that a failed send must NOT be recorded as
--    sent and must remain retryable, the endpoint releases (deletes)
--    the claim row if notifyCustomer() reports sent:false. This RPC
--    is that release step — same secret gate as claim/get, callable
--    only with SUPABASE_RPC_SECRET.
create or replace function public.release_status_email_notification(p_order_number text, p_status text, p_secret text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_expected_secret text;
begin
  select value into v_expected_secret from public.rpc_secrets where key = 'notification_secret';
  if v_expected_secret is null or p_secret is distinct from v_expected_secret then
    raise exception 'Not authorized';
  end if;

  delete from public.order_status_email_notifications
  where order_number = p_order_number and status = p_status;
end;
$$;

grant execute on function public.release_status_email_notification(text, text, text) to anon;

-- 2) Staff-only READ access to order_status_email_notifications, so the
--    Admin Dashboard can show "Kunde benachrichtigt" for a pickup order
--    after a page reload without adding a new column to orders (reusing
--    this existing notification log instead, per the feature spec).
--    Table already has RLS enabled with zero policies (only reachable
--    via SECURITY DEFINER functions before this) — this adds exactly
--    one read-only policy, gated by the same is_staff() check every
--    other admin-read policy in this project already uses.
create policy order_status_email_notifications_staff_read
on public.order_status_email_notifications
for select
using (is_staff());
