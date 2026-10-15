import { createClient } from '@/lib/supabase/server';

/** Zustand der Online-Bestellungen (Tabelle shop_settings, eine Zeile).
 *  Gelesen über get_shop_status(), geschrieben über set_shop_status(). */
export type ShopStatus = {
  paused: boolean;
  /** "HH:MM" (Berlin), nur bei zeitlich begrenzter Pause */
  until: string | null;
  untilIso: string | null;
  indef: boolean;
  /** Zusätzliche Wartezeit in Minuten (0 = normal) */
  extra: number;
};

export const DEFAULT_SHOP_STATUS: ShopStatus = { paused: false, until: null, untilIso: null, indef: false, extra: 0 };

export function toShopStatus(raw: unknown): ShopStatus {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    paused: Boolean(r.paused),
    until: typeof r.until === 'string' ? r.until : null,
    untilIso: typeof r.until_iso === 'string' ? r.until_iso : null,
    indef: Boolean(r.indef),
    extra: Number(r.extra) || 0,
  };
}

export async function getShopStatus(): Promise<ShopStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_shop_status');
  if (error) return DEFAULT_SHOP_STATUS;
  return toShopStatus(data);
}
