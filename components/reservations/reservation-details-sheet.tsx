'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ReservationStatusBadge } from '@/components/reservations/reservation-status-badge';
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog';
import { CustomerDetailsSheet } from '@/components/customers/customer-details-sheet';
import { buildWhatsAppUrl } from '@/lib/phone';
import { toFriendlyReservationError } from '@/lib/reservations/error-messages';
import {
  getReservationDetailsAction,
  updateReservationStatusAction,
  type ReservationDetail,
  type ReservationStatusHistoryEntry,
} from '@/app/(dashboard)/reservations/actions';

type ReservationDetailsSheetProps = {
  reservationId: string | null;
  onClose: () => void;
};

const STATUS_LABELS_RU: Record<string, string> = {
  pending: 'Wartet auf Bestätigung',
  confirmed: 'Bestätigt',
  arrived: 'Gast eingetroffen',
  cancelled: 'Storniert',
};

const STATUS_ACTION_LABELS_RU: Record<string, string> = {
  confirmed: 'Bestätigen',
  arrived: 'Gast eingetroffen',
  cancelled: 'Stornieren',
};

const SOURCE_LABELS: Record<string, string> = {
  system: 'System',
  admin_panel: 'Admin-Panel',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReservationDetailsSheet({ reservationId, onClose }: ReservationDetailsSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [history, setHistory] = useState<ReservationStatusHistoryEntry[]>([]);
  const [allowedNextStatuses, setAllowedNextStatuses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  async function refetch(id: string) {
    const refreshed = await getReservationDetailsAction(id);
    if (refreshed.ok) {
      setReservation(refreshed.reservation);
      setHistory(refreshed.history);
      setAllowedNextStatuses(refreshed.allowedNextStatuses);
    }
    router.refresh();
  }

  useEffect(() => {
    if (!reservationId) {
      setReservation(null);
      setHistory([]);
      setAllowedNextStatuses([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    getReservationDetailsAction(reservationId).then((result) => {
      setIsLoading(false);
      if (!result.ok) {
        setError(toFriendlyReservationError(result.error));
        return;
      }
      setReservation(result.reservation);
      setHistory(result.history);
      setAllowedNextStatuses(result.allowedNextStatuses);
    });
  }, [reservationId]);

  function handleStatusChange(newStatus: string) {
    if (!reservationId) return;

    startTransition(async () => {
      const result = await updateReservationStatusAction(reservationId, newStatus);
      if (!result.ok) {
        setError(toFriendlyReservationError(result.error));
        return;
      }

      await refetch(reservationId);
    });
  }

  const canEdit = reservation ? reservation.status !== 'arrived' && reservation.status !== 'cancelled' : false;

  return (
    <>
      <Sheet open={reservationId !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {isLoading ? (
            <div className="text-muted-foreground p-4 text-sm">Wird geladen…</div>
          ) : error && !reservation ? (
            <div className="text-destructive p-4 text-sm">{error}</div>
          ) : reservation ? (
            <div className="flex flex-col gap-6 p-4">
              <SheetHeader className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <SheetTitle>
                      {formatDate(reservation.date)} · {reservation.time}
                    </SheetTitle>
                    <SheetDescription>Erstellt {formatDateTime(reservation.createdAt)}</SheetDescription>
                  </div>
                  {canEdit ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                      Bearbeiten
                    </Button>
                  ) : null}
                </div>
              </SheetHeader>

              <div>
                <ReservationStatusBadge status={reservation.status} />
              </div>

              <section className="space-y-1 text-sm">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Kunde
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(reservation.customerId)}
                  className="text-left font-medium underline-offset-2 hover:underline"
                >
                  {reservation.customerName}
                </button>
                <p>{reservation.customerPhone}</p>
                {reservation.customerEmail ? <p>{reservation.customerEmail}</p> : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${reservation.customerPhone}`}>Anrufen</a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={buildWhatsAppUrl(reservation.customerPhone)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  </Button>
                </div>
              </section>

              <section className="space-y-1 text-sm">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Reservierung
                </h3>
                <p>Gäste: {reservation.persons}</p>
                {reservation.comment ? <p>Kommentar: {reservation.comment}</p> : null}
              </section>

              <section className="space-y-2 text-sm">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Statusverlauf
                </h3>
                <ul className="space-y-1">
                  {history.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between text-xs">
                      <span>{STATUS_LABELS_RU[entry.status] ?? entry.status}</span>
                      <span className="text-muted-foreground">
                        {formatDateTime(entry.createdAt)} ·{' '}
                        {entry.changedByName ?? SOURCE_LABELS[entry.source] ?? entry.source}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {allowedNextStatuses.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Status ändern
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allowedNextStatuses.map((statusKey) => (
                      <Button
                        key={statusKey}
                        size="sm"
                        variant={statusKey === 'cancelled' ? 'destructive' : 'default'}
                        disabled={isPending}
                        onClick={() => handleStatusChange(statusKey)}
                      >
                        {STATUS_ACTION_LABELS_RU[statusKey] ?? statusKey}
                      </Button>
                    ))}
                  </div>
                </section>
              ) : null}

              {error ? <p className="text-destructive text-sm">{error}</p> : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {reservation ? (
        <EditReservationDialog
          reservation={reservation}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={() => reservationId && refetch(reservationId)}
        />
      ) : null}

      <CustomerDetailsSheet customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
    </>
  );
}
