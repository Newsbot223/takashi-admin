-- Persist the customer's chosen delivery/pickup time ("Wunschzeit").
--
-- Context: the site already collects this (сайт такаши/index.html,
-- field id="orderTime", key `wunschzeit` in orderPayload — either a
-- specific clock time or the "as soon as possible" default) and it's
-- already shown correctly in Telegram (`🕒 *Wunschzeit:*`, built
-- client-side on the site) and in the PDF receipt (api/order.js,
-- detailLines). It was never passed into create_order_from_website —
-- verified against the live function definition before writing this
-- migration — so it was never persisted, which is why Admin can't show
-- it: no existing column holds this value. `orders.estimated_time` is a
-- different concept (a calculated delivery/pickup duration estimate,
-- e.g. "35 Min." — confirmed against real stored rows) and is not
-- reused here to avoid conflating the two.
--
-- p_requested_time is added as a new, OPTIONAL (default null) trailing
-- parameter so this stays backward compatible with any caller that
-- doesn't pass it yet — create_order_from_website is checkout-critical
-- (per api/order.js's own comment: if it fails, the whole checkout
-- fails), so this is deliberately the smallest possible change to it:
-- one new parameter, one new column in the insert list, nothing else
-- in the function body touched.

-- IMPORTANT — overload trap: CREATE OR REPLACE FUNCTION with a DIFFERENT
-- parameter list does NOT replace an existing function, it creates a new
-- overload alongside it (Postgres dispatches by full signature). Applying
-- just the CREATE OR REPLACE below left both the old 16-arg and the new
-- 17-arg create_order_from_website live at once, which is ambiguous for
-- any PostgREST call using only the 16 shared parameter names (the extra
-- one being optional doesn't disambiguate — Postgres can raise "function
-- is not unique"). Caught and fixed within the same deploy window by
-- dropping the old 16-arg overload explicitly (included below) — no
-- production order was placed while both existed, verified by checking
-- for new rows in public.orders immediately after. Recorded here so this
-- migration is correct and idempotent if ever re-run from scratch.

begin;

alter table public.orders add column if not exists requested_time text;

create or replace function public.create_order_from_website(
  p_customer_name text, p_customer_phone text, p_customer_email text,
  p_order_type text, p_delivery_address text, p_delivery_zone text,
  p_delivery_lat numeric, p_delivery_lng numeric,
  p_subtotal numeric, p_delivery_fee numeric, p_total numeric,
  p_payment_method text, p_comment text, p_lang text,
  p_estimated_time text, p_items jsonb,
  p_requested_time text default null
)
 returns orders
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_customer_id uuid;
  v_order       public.orders;
  v_item        jsonb;
begin
  if p_order_type not in ('delivery', 'pickup') then
    raise exception 'Invalid order_type: %', p_order_type;
  end if;

  if p_customer_name is null or trim(p_customer_name) = '' then
    raise exception 'Customer name is required';
  end if;

  if p_customer_phone is null or trim(p_customer_phone) = '' then
    raise exception 'Customer phone is required';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  v_customer_id := public.find_or_create_customer(p_customer_name, p_customer_phone, p_customer_email);

  -- order_number: no value passed — DEFAULT (nextval on order_number_seq,
  -- see 001) generates it here, which is what makes this the single
  -- source of truth. delivery_address NOT NULL-for-delivery is already
  -- enforced by orders_delivery_address_required (001) — not re-checked
  -- here, Postgres does it as part of this INSERT.
  insert into public.orders (
    customer_id, order_type, delivery_address, delivery_zone,
    delivery_lat, delivery_lng, subtotal, delivery_fee, total,
    payment_method, comment, lang, estimated_time, requested_time
  )
  values (
    v_customer_id, p_order_type, p_delivery_address, p_delivery_zone,
    p_delivery_lat, p_delivery_lng, p_subtotal, p_delivery_fee, p_total,
    p_payment_method, p_comment, coalesce(p_lang, 'de'), p_estimated_time, p_requested_time
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (order_id, name, variant, comment, qty, unit_price, line_total)
    values (
      v_order.id,
      v_item->>'name',
      v_item->>'variant',
      v_item->>'comment',
      (v_item->>'qty')::int,
      (v_item->>'unitPrice')::numeric,
      (v_item->>'lineTotal')::numeric
    );
  end loop;

  return v_order;
end;
$function$;

commit;
