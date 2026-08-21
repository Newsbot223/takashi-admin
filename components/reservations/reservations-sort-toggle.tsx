import Link from 'next/link';

import { Button } from '@/components/ui/button';

type ReservationsSortToggleProps = {
  sort: 'asc' | 'desc';
  search?: string;
  status?: string;
};

function buildHref(nextSort: 'asc' | 'desc', search?: string, status?: string) {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (status) params.set('status', status);
  if (nextSort !== 'asc') params.set('sort', nextSort);
  const query = params.toString();
  return query ? `/reservations?${query}` : '/reservations';
}

export function ReservationsSortToggle({ sort, search, status }: ReservationsSortToggleProps) {
  const nextSort = sort === 'asc' ? 'desc' : 'asc';

  return (
    <Button asChild variant="outline" size="sm">
      <Link href={buildHref(nextSort, search, status)}>
        {sort === 'asc' ? 'Ближайшие сначала' : 'Дальние сначала'}
      </Link>
    </Button>
  );
}
