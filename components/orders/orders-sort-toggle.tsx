import Link from 'next/link';

import { Button } from '@/components/ui/button';

type OrdersSortToggleProps = {
  sort: 'asc' | 'desc';
  search?: string;
  status?: string;
};

function buildHref(nextSort: 'asc' | 'desc', search?: string, status?: string) {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (status) params.set('status', status);
  if (nextSort !== 'desc') params.set('sort', nextSort);
  const query = params.toString();
  return query ? `/orders?${query}` : '/orders';
}

export function OrdersSortToggle({ sort, search, status }: OrdersSortToggleProps) {
  const nextSort = sort === 'desc' ? 'asc' : 'desc';

  return (
    <Button asChild variant="outline" size="sm">
      <Link href={buildHref(nextSort, search, status)}>
        {sort === 'desc' ? 'Сначала новые' : 'Сначала старые'}
      </Link>
    </Button>
  );
}
