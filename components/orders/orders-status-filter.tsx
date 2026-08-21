'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OrderStatusOption } from '@/lib/orders/queries';

type OrdersStatusFilterProps = {
  statuses: OrderStatusOption[];
};

const ALL_VALUE = 'all';

export function OrdersStatusFilter({ statuses }: OrdersStatusFilterProps) {
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
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Все статусы" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>Все статусы</SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status.key} value={status.key}>
            {status.labelDe}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
