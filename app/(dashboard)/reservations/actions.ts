'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { getAllowedNextReservationStatuses } from '@/lib/reservations/queries';
import { reservationDetailRowSchema, reservationStatusHistoryRowSchema } from '@/lib/reservations/schemas';

export type ReservationDetail = {
  id: string;
  date: string;
  time: string;
  persons: number;
  comment: string | null;
  status: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
};

export type ReservationStatusHistoryEntry = {
  id: string;
  status: string;
  source: string;
  createdAt: string;
  changedByName: string | null;
};

export type ReservationDetailsResult =
  | {
      ok: true;
      reservation: ReservationDetail;
      history: ReservationStatusHistoryEntry[];
      allowedNextStatuses: string[];
    }
  | { ok: false; error: string };

export async function getReservationDetailsAction(reservationId: string): Promise<ReservationDetailsResult> {
  const supabase = await createClient();

  const { data: reservationRow, error: reservationError } = await supabase
    .from('reservations')
    .select(
      `id, date, time, persons, comment, status, created_at, customer_id,
       customers(name:display_name, phone, email)`,
    )
    .eq('id', reservationId)
    .maybeSingle();

  if (reservationError || !reservationRow) {
    return { ok: false, error: 'Бронирование не найдено' };
  }

  const parsedReservation = reservationDetailRowSchema.parse(reservationRow);

  const { data: historyRows, error: historyError } = await supabase
    .from('reservation_status_history')
    .select('id, status, source, created_at, staff(full_name)')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: true });

  if (historyError) {
    return { ok: false, error: 'Не удалось загрузить историю статусов' };
  }

  const history: ReservationStatusHistoryEntry[] = (historyRows ?? []).map((row) => {
    const parsed = reservationStatusHistoryRowSchema.parse(row);
    return {
      id: parsed.id,
      status: parsed.status,
      source: parsed.source,
      createdAt: parsed.created_at,
      changedByName: parsed.staff?.full_name ?? null,
    };
  });

  const allowedNextStatuses = await getAllowedNextReservationStatuses(parsedReservation.status);

  return {
    ok: true,
    reservation: {
      id: parsedReservation.id,
      date: parsedReservation.date,
      time: parsedReservation.time,
      persons: parsedReservation.persons,
      comment: parsedReservation.comment,
      status: parsedReservation.status,
      createdAt: parsedReservation.created_at,
      customerId: parsedReservation.customer_id,
      customerName: parsedReservation.customers?.name ?? '—',
      customerPhone: parsedReservation.customers?.phone ?? '—',
      customerEmail: parsedReservation.customers?.email ?? null,
    },
    history,
    allowedNextStatuses,
  };
}

export type UpdateReservationStatusResult = { ok: true } | { ok: false; error: string };

/**
 * Единственный способ сменить статус — RPC update_reservation_status(),
 * зеркалит update_order_status(): проверяет is_staff() и валидирует
 * переход по reservation_status_transitions. Прямого UPDATE по
 * reservations нет — грант отозван миграцией 014.
 */
export async function updateReservationStatusAction(
  reservationId: string,
  newStatus: string,
): Promise<UpdateReservationStatusResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('update_reservation_status', {
    p_reservation_id: reservationId,
    p_new_status: newStatus,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/reservations');

  return { ok: true };
}

export type UpdateReservationInput = {
  date: string;
  time: string;
  persons: number;
  comment: string;
};

export type UpdateReservationResult = { ok: true } | { ok: false; error: string };

/**
 * Изменение даты/времени/гостей/комментария — RPC update_reservation_details(),
 * зеркалит update_order_details(): не прямой UPDATE, своя валидация
 * (гостей > 0, нельзя редактировать завершённую бронь), пишет диф в
 * reservation_edit_log.
 */
export async function updateReservationAction(
  reservationId: string,
  input: UpdateReservationInput,
): Promise<UpdateReservationResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('update_reservation_details', {
    p_reservation_id: reservationId,
    p_date: input.date,
    p_time: input.time,
    p_persons: input.persons,
    p_comment: input.comment || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/reservations');

  return { ok: true };
}
