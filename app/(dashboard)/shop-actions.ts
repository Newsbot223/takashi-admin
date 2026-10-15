'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { toShopStatus, type ShopStatus } from '@/lib/shop/status';

type Result = { ok: true; status: ShopStatus } | { ok: false; error: string };

/** action: 'pause' (minutes = null → bis auf Weiteres), 'resume', 'extra' (extra = Minuten) */
export async function setShopStatusAction(
  action: 'pause' | 'resume' | 'extra',
  minutes: number | null = null,
  extra: number | null = null,
): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_shop_status', {
    p_action: action,
    p_minutes: minutes,
    p_extra: extra,
  });
  if (error) {
    return { ok: false, error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true, status: toShopStatus(data) };
}

export async function getShopStatusAction(): Promise<ShopStatus> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_shop_status');
  return toShopStatus(data);
}
