import { CalendarCheck, ClipboardList, UserPlus, Users } from 'lucide-react';

import { StatCard } from '@/components/dashboard/stat-card';

// TODO(Phase 4/5): заменить mock-значения на реальные запросы к Supabase,
// когда будут реализованы разделы "Заказы" и "Бронирования".
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Überblick über den aktuellen Stand des Restaurants</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bestellungen heute" value={24} icon={ClipboardList} />
        <StatCard label="Aktive Reservierungen" value={7} icon={CalendarCheck} />
        <StatCard label="Mitarbeiter online" value={3} icon={Users} />
        <StatCard label="Neue Kunden" value={5} icon={UserPlus} />
      </div>
    </div>
  );
}
