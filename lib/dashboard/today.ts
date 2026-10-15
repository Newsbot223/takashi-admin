import { createClient } from '@/lib/supabase/server';

export type DashboardToday = {
  date: string | null;
  orders: number;
  reservations: number;
  persons: number;
};

/** Kennzahlen für heute (Europe/Berlin). Stornierte Bestellungen/Reservierungen zählen nicht. */
export async function getDashboardToday(): Promise<{ data: DashboardToday; error: boolean }> {
  const empty: DashboardToday = { date: null, orders: 0, reservations: 0, persons: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_dashboard_today');
  if (error || !data || typeof data !== 'object') return { data: empty, error: true };
  const r = data as Record<string, unknown>;
  return {
    data: {
      date: typeof r.date === 'string' ? r.date : null,
      orders: Number(r.orders) || 0,
      reservations: Number(r.reservations) || 0,
      persons: Number(r.persons) || 0,
    },
    error: false,
  };
}
