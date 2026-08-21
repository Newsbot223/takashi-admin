import { z } from 'zod';

/**
 * В проекте нет сгенерированных типов Supabase (types/database.ts),
 * поэтому lib/supabase/client.ts и server.ts создают клиент без
 * generic-параметра Database — сырые ответы supabase-js типизированы
 * неявно как `any`. Эти схемы — точка, где данные из Supabase впервые
 * получают реальный, строгий TypeScript-тип, без единого `any`.
 */

const numericString = z.union([z.number(), z.string()]).transform((value) => Number(value));

export const orderStatusSchema = z.object({
  key: z.string(),
  label_de: z.string(),
  label_en: z.string(),
});

export const orderListRowSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  order_type: z.enum(['delivery', 'pickup']),
  status: z.string(),
  total: numericString,
  created_at: z.string(),
  /** Желаемое клиентом время ("Wunschzeit" на сайте) — НЕ то же самое,
   *  что estimated_time (расчётная оценка длительности, "35 Min.").
   *  null у заказов, оформленных до появления этого поля (миграция
   *  20260821_add_orders_requested_time.sql) — это ожидаемо, не ошибка. */
  requested_time: z.string().nullable(),
  customers: z
    .object({
      name: z.string(),
      phone: z.string(),
    })
    .nullable(),
});

export type OrderListItem = {
  id: string;
  orderNumber: string;
  orderType: 'delivery' | 'pickup';
  status: string;
  total: number;
  createdAt: string;
  requestedTime: string | null;
  customerName: string;
  customerPhone: string;
};

/**
 * Единственное определение select-строки для строки списка заказов —
 * используется и в getOrders() (сервер), и в Realtime-хуке (браузер),
 * чтобы при INSERT-событии не тянуть отдельную, потенциально
 * расходящуюся форму запроса.
 */
export const ORDER_LIST_SELECT =
  'id, order_number, order_type, status, total, created_at, requested_time, customers(name:display_name, phone)';

export function toOrderListItem(row: unknown): OrderListItem {
  const parsed = orderListRowSchema.parse(row);
  return {
    id: parsed.id,
    orderNumber: parsed.order_number,
    orderType: parsed.order_type,
    status: parsed.status,
    total: parsed.total,
    createdAt: parsed.created_at,
    requestedTime: parsed.requested_time,
    customerName: parsed.customers?.name ?? '—',
    customerPhone: parsed.customers?.phone ?? '—',
  };
}

export const idOnlySchema = z.object({
  id: z.string(),
});

export const orderItemRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  variant: z.string().nullable(),
  comment: z.string().nullable(),
  qty: z.number(),
  unit_price: numericString,
  line_total: numericString,
});

export const orderDetailRowSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  customer_id: z.string(),
  order_type: z.enum(['delivery', 'pickup']),
  delivery_address: z.string().nullable(),
  delivery_zone: z.string().nullable(),
  delivery_lat: z.number().nullable(),
  delivery_lng: z.number().nullable(),
  status: z.string(),
  subtotal: numericString,
  discount: numericString,
  delivery_fee: numericString,
  total: numericString,
  payment_method: z.string().nullable(),
  comment: z.string().nullable(),
  lang: z.string(),
  estimated_time: z.string().nullable(),
  requested_time: z.string().nullable(),
  created_at: z.string(),
  customers: z
    .object({
      name: z.string(),
      phone: z.string(),
      email: z.string().nullable(),
    })
    .nullable(),
  order_items: z.array(orderItemRowSchema),
});

export const statusHistoryRowSchema = z.object({
  id: z.string(),
  status: z.string(),
  source: z.string(),
  created_at: z.string(),
  // RLS (staff_select_self_or_admin) отдаёt null для чужой строки staff,
  // если текущий пользователь не admin и не автор записи — не ошибка,
  // штатный случай, обрабатывается на уровне UI.
  staff: z
    .object({
      full_name: z.string(),
    })
    .nullable(),
});
