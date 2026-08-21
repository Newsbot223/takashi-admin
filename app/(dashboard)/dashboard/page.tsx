import { CalendarCheck, ClipboardList, UserPlus, Users } from 'lucide-react';

import { StatCard } from '@/components/dashboard/stat-card';

// TODO(Phase 4/5): заменить mock-значения на реальные запросы к Supabase,
// когда будут реализованы разделы "Заказы" и "Бронирования".
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground text-sm">Обзор текущего состояния ресторана</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Сегодня заказов" value={24} icon={ClipboardList} />
        <StatCard label="Активные брони" value={7} icon={CalendarCheck} />
        <StatCard label="Сотрудников онлайн" value={3} icon={Users} />
        <StatCard label="Новых клиентов" value={5} icon={UserPlus} />
      </div>
    </div>
  );
}
