import { ReservationsSearch } from '@/components/reservations/reservations-search';
import { ReservationsStatusFilter } from '@/components/reservations/reservations-status-filter';
import { ReservationsSortToggle } from '@/components/reservations/reservations-sort-toggle';
import { ReservationsTable } from '@/components/reservations/reservations-table';
import { ReservationsPagination } from '@/components/reservations/reservations-pagination';
import { getReservationStatuses, getReservations } from '@/lib/reservations/queries';

type ReservationsPageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string }>;
};

export default async function ReservationsPage({ searchParams }: ReservationsPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const sort = params.sort === 'desc' ? 'desc' : 'asc';

  const [statuses, { reservations, totalPages }] = await Promise.all([
    getReservationStatuses(),
    getReservations({ search: params.q, status: params.status, page, sort }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Бронирования</h1>
        <p className="text-muted-foreground text-sm">Список всех бронирований столов</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ReservationsSearch />
        <ReservationsStatusFilter statuses={statuses} />
        <ReservationsSortToggle sort={sort} search={params.q} status={params.status} />
      </div>

      <ReservationsTable reservations={reservations} search={params.q} status={params.status} />

      <ReservationsPagination
        page={page}
        totalPages={totalPages}
        search={params.q}
        status={params.status}
      />
    </div>
  );
}
