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
      {reservations.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
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
        </div>
      ) : (
        <>
          {/* Десктоп/планшет — обычная таблица. */}
          <Table className="hidden md:table">
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
              {reservations.map((reservation) => {
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
              })}
            </TableBody>
          </Table>

          {/* Мобильный — карточки вместо таблицы. */}
          <div className="space-y-2 md:hidden">
            {reservations.map((reservation) => {
              const actions = QUICK_ACTIONS[reservation.status] ?? [];

              return (
                <div key={reservation.id} className="bg-card space-y-2 rounded-lg border p-3">
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer items-start justify-between gap-2"
                    onClick={() => setSelectedReservationId(reservation.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedReservationId(reservation.id);
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium">
                        {formatDate(reservation.date)} · {reservation.time}
                      </div>
                      <div className="text-muted-foreground text-sm">{reservation.customerName}</div>
                    </div>
                    <ReservationStatusBadge status={reservation.status} />
                  </div>

                  <div
                    className="text-muted-foreground grid cursor-pointer grid-cols-2 gap-x-2 gap-y-1 text-sm"
                    onClick={() => setSelectedReservationId(reservation.id)}
                  >
                    <span>{reservation.customerPhone}</span>
                    <span className="text-right">Гостей: {reservation.persons}</span>
                  </div>

                  {actions.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {actions.map((action) => (
                        <Button
                          key={action.targetStatus}
                          size="sm"
                          variant={action.variant}
                          disabled={isPending}
                          className="flex-1"
                          onClick={() => handleQuickAction(reservation.id, action.targetStatus)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <ReservationDetailsSheet
        reservationId={selectedReservationId}
        onClose={() => setSelectedReservationId(null)}
      />
    </div>
  );
}
