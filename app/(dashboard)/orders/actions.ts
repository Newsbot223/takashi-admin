'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { getAllowedNextStatuses } from '@/lib/orders/queries';
import {
  orderDetailRowSchema,
  orderStatusEmailNotificationRowSchema,
  statusHistoryRowSchema,
} from '@/lib/orders/schemas';
import { isNotifiableStatus, notifyOrderStatusEmail } from '@/lib/orders/notify-status-email';
import { notifyPickupReady, type NotifyPickupReadyResult } from '@/lib/orders/notify-pickup-ready';

export type OrderDetail = {
  id: string;
  orderNumber: string;
  customerId: string;
  orderType: 'delivery' | 'pickup';
  deliveryAddress: string | null;
  deliveryZone: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  status: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string | null;
  comment: string | null;
  lang: string;
  estimatedTime: string | null;
  requestedTime: string | null;
  /** sent_at из order_status_email_notifications для (order_number,
   *  'ready_for_pickup') — null, если ещё не отправлено. Переиспользует
   *  существующий журнал уведомлений вместо нового поля в orders. */
  pickupReadyNotifiedAt: string | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  items: {
    id: string;
    name: string;
    variant: string | null;
    comment: string | null;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    /** Раздел меню (maki/nigiri/insideout/…) — см. orderItemRowSchema. */
    category: string | null;
  }[];
};

export type OrderStatusHistoryEntry = {
  id: string;
  status: string;
  source: string;
  createdAt: string;
  changedByName: string | null;
};

export type OrderDetailsResult =
  | {
      ok: true;
      order: OrderDetail;
      history: OrderStatusHistoryEntry[];
      allowedNextStatuses: string[];
    }
  | { ok: false; error: string };

export async function getOrderDetailsAction(orderId: string): Promise<OrderDetailsResult> {
  const supabase = await createClient();

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select(
      `id, order_number, customer_id, order_type, delivery_address, delivery_zone,
       delivery_lat, delivery_lng, status,
       subtotal, discount, delivery_fee, total, payment_method, comment, lang, estimated_time, requested_time, created_at,
       customers(name:display_name, phone, email),
       order_items(id, name, variant, comment, qty, unit_price, line_total, category)`,
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !orderRow) {
    return { ok: false, error: 'Заказ не найден' };
  }

  const parsedOrder = orderDetailRowSchema.parse(orderRow);

  const { data: historyRows, error: historyError } = await supabase
    .from('order_status_history')
    .select('id, status, source, created_at, staff(full_name)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (historyError) {
    return { ok: false, error: 'Не удалось загрузить историю статусов' };
  }

  const history: OrderStatusHistoryEntry[] = (historyRows ?? []).map((row) => {
    const parsed = statusHistoryRowSchema.parse(row);
    return {
      id: parsed.id,
      status: parsed.status,
      source: parsed.source,
      createdAt: parsed.created_at,
      changedByName: parsed.staff?.full_name ?? null,
    };
  });

  const allowedNextStatuses = await getAllowedNextStatuses(parsedOrder.status);

  /* Только для Abholung — фича вообще не применяется к доставке.
     Читает существующий журнал уведомлений (order_status_email_notifications,
     staff-only SELECT policy добавлена в 20260826_add_release_status_email_notification_and_staff_read.sql),
     а не новое поле в orders — ошибка чтения не должна ронять всю
     страницу заказа, просто кнопка будет вести себя как "ещё не
     отправлено" (безопасная сторона: в худшем случае лишний клик,
     который сервер сам заблокирует через claim). */
  let pickupReadyNotifiedAt: string | null = null;
  if (parsedOrder.order_type === 'pickup') {
    const { data: notificationRow } = await supabase
      .from('order_status_email_notifications')
      .select('sent_at')
      .eq('order_number', parsedOrder.order_number)
      .eq('status', 'ready_for_pickup')
      .maybeSingle();
    pickupReadyNotifiedAt = notificationRow
      ? orderStatusEmailNotificationRowSchema.parse(notificationRow).sent_at
      : null;
  }

  return {
    ok: true,
    order: {
      id: parsedOrder.id,
      orderNumber: parsedOrder.order_number,
      customerId: parsedOrder.customer_id,
      orderType: parsedOrder.order_type,
      deliveryAddress: parsedOrder.delivery_address,
      deliveryZone: parsedOrder.delivery_zone,
      deliveryLat: parsedOrder.delivery_lat,
      deliveryLng: parsedOrder.delivery_lng,
      status: parsedOrder.status,
      subtotal: parsedOrder.subtotal,
      discount: parsedOrder.discount,
      deliveryFee: parsedOrder.delivery_fee,
      total: parsedOrder.total,
      paymentMethod: parsedOrder.payment_method,
      comment: parsedOrder.comment,
      lang: parsedOrder.lang,
      estimatedTime: parsedOrder.estimated_time,
      requestedTime: parsedOrder.requested_time,
      pickupReadyNotifiedAt,
      createdAt: parsedOrder.created_at,
      customerName: parsedOrder.customers?.name ?? '—',
      customerPhone: parsedOrder.customers?.phone ?? '—',
      customerEmail: parsedOrder.customers?.email ?? null,
      items: parsedOrder.order_items.map((item) => ({
        id: item.id,
        name: item.name,
        variant: item.variant,
        comment: item.comment,
        qty: item.qty,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
        category: item.category,
      })),
    },
    history,
    allowedNextStatuses,
  };
}

export type UpdateOrderStatusResult = { ok: true } | { ok: false; error: string };

/**
 * Единственный способ сменить статус — существующий RPC
 * update_order_status(), который сам проверяет is_staff() и валидирует
 * переход по status_transitions. Прямого UPDATE по orders здесь нет —
 * его и не может быть: RLS уже отзывает UPDATE-грант у authenticated.
 *
 * После УСПЕШНОГО перехода в accepted / on_the_way — best-effort вызов
 * takashi-backend/api/notify-status.js (см. lib/orders/notify-status-email.ts),
 * который переиспользует уже существующую email-систему (notifyCustomer /
 * sendOrderEmail / providers/resend.js), ту же, что использует Telegram-flow.
 * Ничего не отправляется отсюда напрямую и не через Postgres.
 *
 * Email намеренно НЕ может провалить этот Action: ждём его (await) —
 * не fire-and-forget, потому что серверная среда может быть заморожена
 * сразу после ответа, — но любая его ошибка только логируется и не
 * попадает в возвращаемый результат. Статус к этому моменту уже
 * закоммичен в базе самим RPC, откатывать нечего.
 */
export async function updateOrderStatusAction(
  orderId: string,
  newStatus: string,
): Promise<UpdateOrderStatusResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('update_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/orders');

  if (isNotifiableStatus(newStatus)) {
    const orderNumber = (data as { order_number?: string } | null)?.order_number;
    if (orderNumber) {
      try {
        await notifyOrderStatusEmail(orderNumber, newStatus);
      } catch (notifyError) {
        // notifyOrderStatusEmail already catches internally and never
        // throws — this is a defensive second layer only, so a
        // genuinely unexpected failure here still can't turn a
        // successful status change into a reported failure.
        console.error('[Orders] Unexpected error while sending status email:', notifyError);
      }
    } else {
      console.error(`[Orders] update_order_status succeeded but returned no order_number — skipped status email for order ${orderId}`);
    }
  }

  return { ok: true };
}

export type UpdateOrderInput = {
  deliveryAddress: string;
  deliveryZone: string;
  comment: string;
  paymentMethod: string;
  estimatedTime: string;
  discount: number;
};

export type UpdateOrderResult = { ok: true } | { ok: false; error: string };

/**
 * Редактирование заказа — тоже не прямой UPDATE, а два RPC
 * (update_order_details + update_order_discount), каждый со своей
 * валидацией на стороне базы. Оба пишут диф в order_edit_log.
 */
export async function updateOrderAction(
  orderId: string,
  input: UpdateOrderInput,
): Promise<UpdateOrderResult> {
  const supabase = await createClient();

  const { error: detailsError } = await supabase.rpc('update_order_details', {
    p_order_id: orderId,
    p_delivery_address: input.deliveryAddress || null,
    p_delivery_zone: input.deliveryZone || null,
    p_comment: input.comment || null,
    p_payment_method: input.paymentMethod || null,
    p_estimated_time: input.estimatedTime || null,
  });

  if (detailsError) {
    return { ok: false, error: detailsError.message };
  }

  const { error: discountError } = await supabase.rpc('update_order_discount', {
    p_order_id: orderId,
    p_discount: input.discount,
  });

  if (discountError) {
    return { ok: false, error: discountError.message };
  }

  revalidatePath('/orders');

  return { ok: true };
}

export type OrderHistoryCleanupPreviewResult = { ok: true; count: number } | { ok: false; error: string };

/**
 * Считает, сколько заказов попадёт под удаление — только предпросмотр,
 * ничего не меняет. RPC count_orders_for_history_cleanup сама фильтрует
 * по is_staff() и по терминальным статусам (order_statuses.is_terminal) —
 * здесь нет и не должно быть повторной фильтрации на клиенте, доверять
 * количеству с сервера, не пересчитывать.
 */
export async function previewOrderHistoryCleanupAction(
  beforeDate: string,
): Promise<OrderHistoryCleanupPreviewResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('count_orders_for_history_cleanup', {
    p_before_date: beforeDate,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, count: data ?? 0 };
}

/**
 * "Bestellung fertig — Kunde benachrichtigen" — только для Abholung.
 * НЕ меняет orders.status (заказ остаётся в своём текущем статусе,
 * см. requirement "не путать отправку уведомления со сменой статуса").
 * Дедупликация полностью на стороне takashi-backend/api/notify-pickup-ready.js
 * (claim_status_email_notification с ключом 'ready_for_pickup') — здесь
 * только сетевой вызов и revalidatePath после успешной отправки, чтобы
 * getOrderDetailsAction на следующем открытии заказа подтянул
 * pickupReadyNotifiedAt и кнопка сама стала disabled.
 */
export async function notifyPickupReadyAction(orderNumber: string): Promise<NotifyPickupReadyResult> {
  const result = await notifyPickupReady(orderNumber);
  if (result.ok && result.sent) {
    revalidatePath('/orders');
  }
  return result;
}

export type ClearOrderHistoryResult = { ok: true; deletedCount: number } | { ok: false; error: string };

/**
 * Административное удаление истории заказов — только через RPC
 * clear_order_history, которая сама (а) проверяет is_staff(), (б)
 * фильтрует по is_terminal-статусам, (в) сравнивает дату в Europe/Berlin,
 * не в UTC. Активные заказы физически не могут попасть в WHERE этой
 * функции — фильтр по терминальным статусам зашит в саму RPC, а не
 * передаётся с клиента, так что подменить его нечем.
 *
 * Не вызывает updateOrderStatusAction, notifyOrderStatusEmail, никакие
 * Telegram/email-уведомления — это только массовое администативное
 * удаление, RPC на стороне базы тоже ничего не отправляет, только
 * DELETE с ON DELETE CASCADE на дочерние таблицы.
 */
export async function clearOrderHistoryAction(beforeDate: string): Promise<ClearOrderHistoryResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('clear_order_history', {
    p_before_date: beforeDate,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/orders');

  return { ok: true, deletedCount: data ?? 0 };
}
