import { createClient } from '@/lib/supabase/server';
import {
  customerRowSchema,
  customerOrderRowSchema,
  customerReservationRowSchema,
  customerNoteRowSchema,
} from '@/lib/customers/schemas';

export type CustomerOrderHistoryItem = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
};

export type CustomerReservationHistoryItem = {
  id: string;
  date: string;
  time: string;
  persons: number;
  status: string;
};

export type CustomerNote = {
  id: string;
  note: string;
  createdAt: string;
  authorName: string | null;
};

export type CustomerAddress = {
  address: string;
  lat: number | null;
  lng: number | null;
};

export type CustomerDetails = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  averageCheck: number;
  lastOrderAt: string | null;
  addresses: CustomerAddress[];
  orders: CustomerOrderHistoryItem[];
  reservations: CustomerReservationHistoryItem[];
  notes: CustomerNote[];
};

/**
 * Агрегаты (кол-во заказов, сумма, средний чек, адреса) считаются
 * из уже полученных строк orders, а не отдельным SQL-агрегатом —
 * заказов на одного клиента реалистично немного, отдельная
 * агрегирующая функция/вью была бы преждевременной оптимизацией.
 */
export async function getCustomerDetails(customerId: string): Promise<CustomerDetails | null> {
  const supabase = await createClient();

  const { data: customerRow, error: customerError } = await supabase
    .from('customers')
    .select('id, name:display_name, phone, email, created_at')
    .eq('id', customerId)
    .maybeSingle();

  if (customerError || !customerRow) {
    return null;
  }

  const customer = customerRowSchema.parse(customerRow);

  const [ordersResponse, reservationsResponse, notesResponse] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, delivery_address, delivery_lat, delivery_lng')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('reservations')
      .select('id, date, time, persons, status')
      .eq('customer_id', customerId)
      .order('date', { ascending: false }),
    supabase
      .from('customer_notes')
      .select('id, note, created_at, staff(full_name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ]);

  if (ordersResponse.error) throw new Error(ordersResponse.error.message);
  if (reservationsResponse.error) throw new Error(reservationsResponse.error.message);
  if (notesResponse.error) throw new Error(notesResponse.error.message);

  const parsedOrders = (ordersResponse.data ?? []).map((row) => customerOrderRowSchema.parse(row));
  const reservations = (reservationsResponse.data ?? []).map((row) =>
    customerReservationRowSchema.parse(row),
  );
  const notes: CustomerNote[] = (notesResponse.data ?? []).map((row) => {
    const parsed = customerNoteRowSchema.parse(row);
    return {
      id: parsed.id,
      note: parsed.note,
      createdAt: parsed.created_at,
      authorName: parsed.staff?.full_name ?? null,
    };
  });

  const orders: CustomerOrderHistoryItem[] = parsedOrders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    total: order.total,
    createdAt: order.created_at,
  }));

  const orderCount = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
  const averageCheck = orderCount > 0 ? totalSpent / orderCount : 0;
  const lastOrderAt = orders[0]?.createdAt ?? null;

  // parsedOrders отсортирован по created_at desc — Map.set() при первом
  // попадании текста адреса сохранит координаты именно САМОГО СВЕЖЕГО
  // заказа с этим адресом, что и есть нужная семантика "текущий адрес".
  const addressMap = new Map<string, CustomerAddress>();
  for (const order of parsedOrders) {
    if (order.delivery_address && !addressMap.has(order.delivery_address)) {
      addressMap.set(order.delivery_address, {
        address: order.delivery_address,
        lat: order.delivery_lat,
        lng: order.delivery_lng,
      });
    }
  }
  const addresses = Array.from(addressMap.values());

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    createdAt: customer.created_at,
    orderCount,
    totalSpent,
    averageCheck,
    lastOrderAt,
    addresses,
    orders,
    reservations: reservations.map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      persons: r.persons,
      status: r.status,
    })),
    notes,
  };
}
