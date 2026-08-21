import { createClient } from '@/lib/supabase/server';
import {
  idOnlySchema,
  orderStatusSchema,
  ORDER_LIST_SELECT,
  toOrderListItem,
  type OrderListItem,
} from '@/lib/orders/schemas';
import { z } from 'zod';

const toStatusOnlySchema = z.object({ to_status: z.string() });

export const ORDERS_PAGE_SIZE = 20;

export type { OrderListItem };

export type OrderStatusOption = {
  key: string;
  labelDe: string;
  labelEn: string;
};

export async function getOrderStatuses(): Promise<OrderStatusOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('order_statuses')
    .select('key, label_de, label_en')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const parsed = orderStatusSchema.parse(row);
    return { key: parsed.key, labelDe: parsed.label_de, labelEn: parsed.label_en };
  });
}

export type GetOrdersParams = {
  search?: string;
  status?: string;
  page?: number;
  sort?: 'asc' | 'desc';
};

export type GetOrdersResult = {
  orders: OrderListItem[];
  totalCount: number;
  totalPages: number;
  page: number;
};

export async function getOrders({
  search,
  status,
  page = 1,
  sort = 'desc',
}: GetOrdersParams): Promise<GetOrdersResult> {
  const supabase = await createClient();
  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * ORDERS_PAGE_SIZE;
  const to = from + ORDERS_PAGE_SIZE - 1;

  // Поиск по имени/телефону клиента требует отдельного шага: orders
  // и customers — разные таблицы, PostgREST не умеет OR по колонкам
  // через связь в одном .or(). Сначала находим id подходящих клиентов,
  // затем используем их в основном запросе к orders.
  let matchingCustomerIds: string[] = [];

  if (search) {
    const { data: customerMatches } = await supabase
      .from('customers')
      .select('id')
      .or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    matchingCustomerIds = (customerMatches ?? []).map((row) => idOnlySchema.parse(row).id);
  }

  let query = supabase
    .from('orders')
    .select(ORDER_LIST_SELECT, {
      count: 'exact',
    })
    .order('created_at', { ascending: sort === 'asc' })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    const conditions = [`order_number.ilike.%${search}%`];
    if (matchingCustomerIds.length > 0) {
      conditions.push(`customer_id.in.(${matchingCustomerIds.join(',')})`);
    }
    query = query.or(conditions.join(','));
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const orders: OrderListItem[] = (data ?? []).map((row) => toOrderListItem(row));

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ORDERS_PAGE_SIZE));

  return { orders, totalCount, totalPages, page: currentPage };
}

/**
 * Разрешённые следующие статусы читаются напрямую из status_transitions,
 * без embed на order_statuses — у status_transitions два FK на
 * order_statuses (from_status и to_status), embed был бы неоднозначен
 * для PostgREST без явного указания имени constraint'а, которое я не
 * могу проверить без доступа к живой базе. Подписи для to_status берутся
 * из уже загруженного на странице списка order_statuses.
 */
export async function getAllowedNextStatuses(currentStatus: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('status_transitions')
    .select('to_status')
    .eq('from_status', currentStatus);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toStatusOnlySchema.parse(row).to_status);
}
