'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { getMenuItems, type MenuItem, type SoldOutMode } from '@/lib/menu/items';

type Result = { ok: true; soldOut: string[] } | { ok: false; error: string };

/** mode: 'today' = nur heute ausverkauft, 'indef' = bis auf Weiteres, 'off' = wieder verfügbar */
export async function setItemSoldOutAction(key: string, mode: SoldOutMode): Promise<Result> {
  if (!['today', 'indef', 'off'].includes(mode)) {
    return { ok: false, error: 'Ungültige Aktion.' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_item_sold_out', { p_key: key, p_mode: mode });
  if (error) {
    return { ok: false, error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' };
  }
  revalidatePath('/menu');
  return { ok: true, soldOut: Array.isArray(data) ? data.map(String) : [] };
}

export async function getMenuItemsAction(): Promise<MenuItem[] | null> {
  const { items, error } = await getMenuItems();
  return error ? null : items;
}
