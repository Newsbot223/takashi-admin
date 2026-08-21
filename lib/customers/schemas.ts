import { z } from 'zod';

const numericString = z.union([z.number(), z.string()]).transform((value) => Number(value));

export const customerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  created_at: z.string(),
});

export const customerOrderRowSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  status: z.string(),
  total: numericString,
  created_at: z.string(),
  delivery_address: z.string().nullable(),
  delivery_lat: z.number().nullable(),
  delivery_lng: z.number().nullable(),
});

export const customerReservationRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  persons: z.number(),
  status: z.string(),
});

export const customerNoteRowSchema = z.object({
  id: z.string(),
  note: z.string(),
  created_at: z.string(),
  // Как и в истории статусов заказа: RLS на staff отдаёт null для
  // чужой строки, если текущий пользователь не admin и не автор.
  staff: z
    .object({
      full_name: z.string(),
    })
    .nullable(),
});
