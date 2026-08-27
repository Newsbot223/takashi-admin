-- Adds requested_time (aliased as "wunschzeit", matching the field name
-- already used in the website's order payload and in api/order.js's
-- creation-time email) to get_order_for_notification's JSON output, so
-- status-change emails (accepted/on_the_way, and the new
-- ready_for_pickup notification) can distinguish a customer's specific
-- chosen time from an ASAP order the same way the creation-time email
-- already can via _orderPayload.wunschzeit.
--
-- Same 2-arg signature (p_order_number text, p_secret text) as before —
-- CREATE OR REPLACE, no new overload, no ambiguity risk (unlike the
-- create_order_from_website incident on 2026-08-21, documented in
-- 20260821_add_orders_requested_time.sql).
CREATE OR REPLACE FUNCTION public.get_order_for_notification(p_order_number text, p_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_expected_secret text;
  v_order           public.orders;
  v_customer        public.customers;
  v_items           jsonb;
begin
  select value into v_expected_secret from public.rpc_secrets where key = 'notification_secret';

  if v_expected_secret is null or p_secret is distinct from v_expected_secret then
    raise exception 'Not authorized';
  end if;

  select * into v_order from public.orders where order_number = p_order_number;
  if v_order.id is null then
    return null;
  end if;

  select * into v_customer from public.customers where id = v_order.customer_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'name',      name,
    'variant',   variant,
    'comment',   comment,
    'qty',       qty,
    'unitPrice', unit_price,
    'lineTotal', line_total
  )), '[]'::jsonb)
  into v_items
  from public.order_items
  where order_id = v_order.id;

  return jsonb_build_object(
    'orderId',         v_order.order_number,
    'orderType',       case when v_order.order_type = 'delivery' then 'lieferung' else 'abholung' end,
    'customer',        jsonb_build_object(
                          'name',  v_customer.name,
                          'phone', v_customer.phone,
                          'email', v_customer.email
                        ),
    'deliveryAddress', v_order.delivery_address,
    'deliveryZone',    v_order.delivery_zone,
    'items',           v_items,
    'subtotal',        v_order.subtotal,
    'fee',             v_order.delivery_fee,
    'total',           v_order.total,
    'paymentMethod',   v_order.payment_method,
    'comment',         v_order.comment,
    'lang',            v_order.lang,
    'estimatedTime',   v_order.estimated_time,
    'wunschzeit',      v_order.requested_time,
    'createdAt',       v_order.created_at
  );
end;
$function$;
