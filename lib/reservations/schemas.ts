import { z } from 'zod';

export const reservationStatusSchema = z.object({
  key: z.string(),
  label_de: z.string(),
  label_en: z.string(),
});

export const reservationListRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  persons: z.number(),
  status: z.string(),
  created_at: z.string(),
  customers: z
    .object({
      name: z.string(),
      phone: z.string(),
    })
    .nullable(),
});

export const reservationDetailRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  persons: z.number(),
  comment: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  customer_id: z.string(),
  customers: z
    .object({
      name: z.string(),
      phone: z.string(),
      email: z.string().nullable(),
    })
    .nullable(),
});

export const reservationStatusHistoryRowSchema = z.object({
  id: z.string(),
  status: z.string(),
  source: z.string(),
  created_at: z.string(),
  // Как и в истории статусов заказа: RLS на staff отдаёт null для
  // чужой строки, если текущий пользователь не admin и не автор.
  staff: z
    .object({
      full_name: z.string(),
    })
    .nullable(),
});

export type ReservationListItem = {
  id: string;
  date: string;
  time: string;
  persons: number;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
};

export const RESERVATION_LIST_SELECT =
  'id, date, time, persons, status, created_at, customers(name:display_name, phone)';

export function toReservationListItem(row: unknown): ReservationListItem {
  const parsed = reservationListRowSchema.parse(row);
  return {
    id: parsed.id,
    date: parsed.date,
    time: parsed.time,
    persons: parsed.persons,
    status: parsed.status,
    createdAt: parsed.created_at,
    customerName: parsed.customers?.name ?? '—',
    customerPhone: parsed.customers?.phone ?? '—',
  };
}
