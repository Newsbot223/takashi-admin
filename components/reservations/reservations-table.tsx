'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ReservationStatusBadge } from '@/components/reservations/reservation-status-badge';
import { ReservationDetailsSheet } from '@/components/reservations/reservation-details-sheet';
import { updateReservationStatusAction } from '@/app/(dashboard)/reservations/actions';
import type { ReservationListItem } from '@/lib/reservations/queries';

type ReservationsTableProps = {
  reservations: ReservationListItem[];
  search?: string;
  status?: string;
};

const QUICK_ACTIONS: Record<string, { targetStatus: string; label: string; variant: 'default' | 'destructive' }[]> = {
  pending: [
    { targetStatus: 'confirmed', label: 'Подтвердить', variant: 'default' },
    { targetStatus: 'cancelled', label: 'Отменить', variant: 'destructive' },
  ],
  confirmed: [
    { targetStatus: 'arrived', label: 'Гость пришёл', variant: 'default' },
    { targetStatus: 'cancelled', label: 'Отменить', variant: 'destructive' },
  ],
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ReservationsTable({ reservations, search, status }: ReservationsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const hasActiveFilters = Boolean(search || status);

  function handleQuickAction(reservationId: string, targetStatus: string) {
    startTransition(async () => {
      await updateReservationStatusAction(reservationId, targetStatus);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Время</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Гостей</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Быстрые действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                {hasActiveFilters ? (
                  <div className="space-y-2">
                    <p>Ничего не найдено</p>
                    <Button asChild variant="outline" size="sm">
                      <a href="/reservations">Сбросить фильтры</a>
                    </Button>
                  </div>
                ) : (
                  <p>Бронирований пока нет — они появятся здесь автоматически</p>
                )}
              </TableCell>
            </TableRow>
          ) : (
            reservations.map((reservation) => {
              const actions = QUICK_ACTIONS[reservation.status] ?? [];

              return (
                <TableRow key={reservation.id}>
                  <TableCell
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer font-medium"
                    onClick={() => setSelectedReservationId(reservation.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedReservationId(reservation.id);
                      }
                    }}
                  >
                    {formatDate(reservation.date)}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => setSelectedReservationId(reservation.id)}
                  >
                    {reservation.time}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => setSelectedReservationId(reservation.id)}
                  >
                    {reservation.customerName}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => setSelectedReservationId(reservation.id)}
                  >
                    {reservation.customerPhone}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => setSelectedReservationId(reservation.id)}
                  >
                    {reservation.persons}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => setSelectedReservationId(reservation.id)}
                  >
                    <ReservationStatusBadge status={reservation.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {actions.map((action) => (
                        <Button
                          key={action.targetStatus}
                          size="sm"
                          variant={action.variant}
                          disabled={isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleQuickAction(reservation.id, action.targetStatus);
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <ReservationDetailsSheet
        reservationId={selectedReservationId}
        onClose={() => setSelectedReservationId(null)}
      />
    </div>
  );
}
