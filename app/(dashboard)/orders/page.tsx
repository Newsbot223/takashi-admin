import { OrdersSearch } from '@/components/orders/orders-search';
import { OrdersStatusFilter } from '@/components/orders/orders-status-filter';
import { OrdersSortToggle } from '@/components/orders/orders-sort-toggle';
import { OrdersTable } from '@/components/orders/orders-table';
import { OrdersPagination } from '@/components/orders/orders-pagination';
import { ClearOrderHistoryButton } from '@/components/orders/clear-order-history-dialog';
import { getOrderStatuses, getOrders } from '@/lib/orders/queries';

type OrdersPageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string }>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const sort = params.sort === 'asc' ? 'asc' : 'desc';

  const [statuses, { orders, totalPages }] = await Promise.all([
    getOrderStatuses(),
    getOrders({ search: params.q, status: params.status, page, sort }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заказы</h1>
          <p className="text-muted-foreground text-sm">Список всех заказов ресторана</p>
        </div>

        <ClearOrderHistoryButton />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <OrdersSearch />
        <OrdersStatusFilter statuses={statuses} />
        <OrdersSortToggle sort={sort} search={params.q} status={params.status} />
      </div>

      <OrdersTable orders={orders} statuses={statuses} search={params.q} status={params.status} />

      <OrdersPagination page={page} totalPages={totalPages} search={params.q} status={params.status} />
    </div>
  );
}
