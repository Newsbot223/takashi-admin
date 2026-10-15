import { createClient } from '@/lib/supabase/server';

export type SoldOutMode = 'today' | 'indef' | 'off';

export type MenuItem = {
  key: string;
  cat: string;
  catTitle: string;
  catSort: number;
  no: string;
  name: string;
  price: string | null;
  sort: number;
  soldOut: boolean;
  indef: boolean;
};

export function toMenuItem(raw: unknown): MenuItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.key !== 'string') return null;
  return {
    key: r.key,
    cat: String(r.cat ?? ''),
    catTitle: String(r.cat_title ?? r.cat ?? ''),
    catSort: Number(r.cat_sort ?? 0),
    no: String(r.no ?? ''),
    name: String(r.name ?? ''),
    price: r.price == null ? null : String(r.price),
    sort: Number(r.sort ?? 0),
    soldOut: Boolean(r.sold_out),
    indef: Boolean(r.indef),
  };
}

/** Alle Gerichte (sortiert nach Kategorie und Reihenfolge der Speisekarte). */
export async function getMenuItems(): Promise<{ items: MenuItem[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_menu_items_admin');
  if (error || !Array.isArray(data)) return { items: [], error: true };
  const items = data.map(toMenuItem).filter((x): x is MenuItem => x !== null);
  items.sort((a, b) => a.catSort - b.catSort || a.sort - b.sort);
  return { items, error: false };
}
