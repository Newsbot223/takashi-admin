'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { getCustomerDetails, type CustomerDetails } from '@/lib/customers/queries';

export type CustomerDetailsResult = { ok: true; customer: CustomerDetails } | { ok: false; error: string };

export async function getCustomerDetailsAction(customerId: string): Promise<CustomerDetailsResult> {
  const customer = await getCustomerDetails(customerId);

  if (!customer) {
    return { ok: false, error: 'Клиент не найден' };
  }

  return { ok: true, customer };
}

export type AddCustomerNoteResult = { ok: true } | { ok: false; error: string };

export async function addCustomerNoteAction(
  customerId: string,
  note: string,
): Promise<AddCustomerNoteResult> {
  const trimmed = note.trim();

  if (!trimmed) {
    return { ok: false, error: 'Заметка не может быть пустой' };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Не авторизован' };
  }

  const { error } = await supabase.from('customer_notes').insert({
    customer_id: customerId,
    author_id: user.id,
    note: trimmed,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/orders');
  revalidatePath('/customers');

  return { ok: true };
}
