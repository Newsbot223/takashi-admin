import Link from 'next/link';

import { Button } from '@/components/ui/button';

type OrdersPaginationProps = {
  page: number;
  totalPages: number;
  search?: string;
  status?: string;
};

function buildHref(page: number, search?: string, status?: string) {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (status) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/orders?${query}` : '/orders';
}

export function OrdersPagination({ page, totalPages, search, status }: OrdersPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-muted-foreground text-sm">
        Страница {page} из {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className={prevDisabled ? 'pointer-events-none opacity-50' : undefined}
        >
          <Link
            href={buildHref(page - 1, search, status)}
            aria-disabled={prevDisabled}
            tabIndex={prevDisabled ? -1 : undefined}
          >
            Назад
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={nextDisabled ? 'pointer-events-none opacity-50' : undefined}
        >
          <Link
            href={buildHref(page + 1, search, status)}
            aria-disabled={nextDisabled}
            tabIndex={nextDisabled ? -1 : undefined}
          >
            Далее
          </Link>
        </Button>
      </div>
    </div>
  );
}
