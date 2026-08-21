import { createClient } from '@/lib/supabase/server';
import {
  reservationStatusSchema,
  RESERVATION_LIST_SELECT,
  toReservationListItem,
  type ReservationListItem,
} from '@/lib/reservations/schemas';
import { idOnlySchema } from '@/lib/orders/schemas';
import { z } from 'zod';

const toStatusOnlySchema = z.object({ to_status: z.string() });

export const RESERVATIONS_PAGE_SIZE = 20;

export type { ReservationListItem };

export type ReservationStatusOption = {
  key: string;
  labelDe: string;
  labelEn: string;
};

export async function getReservationStatuses(): Promise<ReservationStatusOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reservation_statuses')
    .select('key, label_de, label_en')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const parsed = reservationStatusSchema.parse(row);
    return { key: parsed.key, labelDe: parsed.label_de, labelEn: parsed.label_en };
  });
}

export type GetReservationsParams = {
  search?: string;
  status?: string;
  page?: number;
  sort?: 'asc' | 'desc';
};

export type GetReservationsResult = {
  reservations: ReservationListItem[];
  totalCount: number;
  totalPages: number;
  page: number;
};

export async function getReservations({
  search,
  status,
  page = 1,
  sort = 'asc',
}: GetReservationsParams): Promise<GetReservationsResult> {
  const supabase = await createClient();
  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * RESERVATIONS_PAGE_SIZE;
  const to = from + RESERVATIONS_PAGE_SIZE - 1;

  // Поиск по имени/телефону клиента — та же двухшаговая схема, что в
  // getOrders(): сначала находим id подходящих клиентов, затем
  // фильтруем по ним основной запрос (PostgREST не умеет OR по
  // колонкам связанной таблицы в одном .or()).
  let matchingCustomerIds: string[] = [];

  if (search) {
    const { data: customerMatches } = await supabase
      .from('customers')
      .select('id')
      .or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    matchingCustomerIds = (customerMatches ?? []).map((row) => idOnlySchema.parse(row).id);
  }

  let query = supabase
    .from('reservations')
    .select(RESERVATION_LIST_SELECT, { count: 'exact' })
    .order('date', { ascending: sort === 'asc' })
    .order('time', { ascending: sort === 'asc' })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    if (matchingCustomerIds.length === 0) {
      // Ни один клиент не подошёл под поиск — результат заведомо пуст,
      // не отправляем запрос с пустым IN(), чтобы не ловить ошибку синтаксиса.
      return { reservations: [], totalCount: 0, totalPages: 1, page: currentPage };
    }
    query = query.in('customer_id', matchingCustomerIds);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const reservations: ReservationListItem[] = (data ?? []).map((row) => toReservationListItem(row));

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / RESERVATIONS_PAGE_SIZE));

  return { reservations, totalCount, totalPages, page: currentPage };
}

export async function getAllowedNextReservationStatuses(currentStatus: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reservation_status_transitions')
    .select('to_status')
    .eq('from_status', currentStatus);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toStatusOnlySchema.parse(row).to_status);
}
