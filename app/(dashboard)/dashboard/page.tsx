import { CalendarCheck, ClipboardList } from 'lucide-react';

import { AutoRefresh } from '@/components/dashboard/auto-refresh';
import { StatCard } from '@/components/dashboard/stat-card';
import { getDashboardToday } from '@/lib/dashboard/today';

function formatToday(iso: string | null) {
  const d = iso ? new Date(`${iso}T12:00:00`) : new Date();
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Berlin' });
}

export default async function DashboardPage() {
  const { data, error } = await getDashboardToday();
  const personsLabel = `${data.persons} ${data.persons === 1 ? 'Person' : 'Personen'} insgesamt`;

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={60} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Heute, {formatToday(data.date)}</p>
      </div>

      {error && (
        <p className="text-destructive text-sm">Kennzahlen konnten nicht geladen werden. Bitte Seite neu laden.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Bestellungen heute"
          value={data.orders}
          icon={ClipboardList}
          hint="ohne stornierte"
          href="/orders"
        />
        <StatCard
          label="Reservierungen heute"
          value={data.reservations}
          icon={CalendarCheck}
          hint={personsLabel}
          href="/reservations"
        />
      </div>
    </div>
  );
}
