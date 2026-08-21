import { createClient } from '@/lib/supabase/client';
import { ORDER_LIST_SELECT, orderListRowSchema, toOrderListItem } from '@/lib/orders/schemas';
import type { OrderListItem } from '@/lib/orders/queries';

/**
 * Та же select-строка и та же Zod-схема/маппер, что использует
 * серверный getOrders() (lib/orders/schemas.ts) — при Realtime-событии
 * дотягиваем данные джойна с клиентом (Realtime не присылает embed),
 * не изобретая параллельную форму запроса. Вынесена из orders-table.tsx
 * сюда, потому что теперь нужна в двух местах (таблица + баннер алерта).
 */
export async function fetchOrderListItem(orderId: string): Promise<OrderListItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('orders').select(ORDER_LIST_SELECT).eq('id', orderId).maybeSingle();

  if (error || !data) return null;

  return toOrderListItem(orderListRowSchema.parse(data));
}
