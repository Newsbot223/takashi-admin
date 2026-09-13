'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReservationStatusOption } from '@/lib/reservations/queries';

const STATUS_LABELS_RU: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждено',
  arrived: 'Гость пришёл',
  cancelled: 'Отменено',
};

type ReservationsStatusFilterProps = {
  statuses: ReservationStatusOption[];
};

const ALL_VALUE = 'all';

export function ReservationsStatusFilter({ statuses }: ReservationsStatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') ?? ALL_VALUE;

  function handleChange(nextStatus: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextStatus === ALL_VALUE) {
      params.delete('status');
    } else {
      params.set('status', nextStatus);
    }
    params.delete('page');

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue placeholder="Все статусы" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>Все статусы</SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status.key} value={status.key}>
            {STATUS_LABELS_RU[status.key] ?? status.key}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
