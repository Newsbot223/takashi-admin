'use client';

import { useEffect, useState } from 'react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MapsQrCode } from '@/components/shared/maps-qr-code';
import { AddCustomerNoteForm } from '@/components/customers/add-note-form';
import { buildMapsUrl } from '@/lib/maps';
import { buildWhatsAppUrl } from '@/lib/phone';
import { getCustomerDetailsAction } from '@/app/(dashboard)/customers/actions';
import type { CustomerDetails } from '@/lib/customers/queries';

type CustomerDetailsSheetProps = {
  customerId: string | null;
  onClose: () => void;
};

function formatMoney(value: number) {
  return `${value.toFixed(2)} €`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CustomerDetailsSheet({ customerId, onClose }: CustomerDetailsSheetProps) {
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload(id: string) {
    setIsLoading(true);
    setError(null);
    const result = await getCustomerDetailsAction(id);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCustomer(result.customer);
  }

  useEffect(() => {
    if (!customerId) {
      setCustomer(null);
      setError(null);
      return;
    }
    reload(customerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const primaryAddress = customer?.addresses[0] ?? null;
  const mapsUrl = primaryAddress
    ? buildMapsUrl(primaryAddress.address, primaryAddress.lat, primaryAddress.lng)
    : null;

  return (
    <Sheet open={customerId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        {isLoading ? (
          <div className="text-muted-foreground p-4 text-sm">Загрузка…</div>
        ) : error ? (
          <div className="text-destructive p-4 text-sm">{error}</div>
        ) : customer ? (
          <div className="flex flex-col gap-6 p-4">
            <SheetHeader className="p-0">
              <SheetTitle>{customer.name}</SheetTitle>
              <SheetDescription>Клиент с {formatDate(customer.createdAt)}</SheetDescription>
            </SheetHeader>

            <section className="space-y-1 text-sm">
              <p>{customer.phone}</p>
              {customer.email ? <p>{customer.email}</p> : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${customer.phone}`}>Позвонить</a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={buildWhatsAppUrl(customer.phone)} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </Button>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">Заказов</div>
                <div className="text-lg font-semibold">{customer.orderCount}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">Сумма заказов</div>
                <div className="text-lg font-semibold">{formatMoney(customer.totalSpent)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">Средний чек</div>
                <div className="text-lg font-semibold">{formatMoney(customer.averageCheck)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">Последний заказ</div>
                <div className="text-sm font-medium">
                  {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
                </div>
              </div>
            </section>

            {customer.addresses.length > 0 ? (
              <section className="space-y-2 text-sm">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Адреса
                </h3>
                <ul className="space-y-1">
                  {customer.addresses.map((addr) => {
                    const addrMapsUrl = buildMapsUrl(addr.address, addr.lat, addr.lng);
                    return (
                      <li key={addr.address} className="flex items-center justify-between gap-2">
                        <span>{addr.address}</span>
                        {addrMapsUrl ? (
                          <a
                            href={addrMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary shrink-0 text-xs underline-offset-2 hover:underline"
                          >
                            Maps
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {mapsUrl ? (
                  <div className="flex items-center gap-3 pt-1">
                    <Button asChild size="sm" variant="outline">
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                        Открыть в Google Maps
                      </a>
                    </Button>
                    <MapsQrCode url={mapsUrl} size={72} />
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="space-y-2 text-sm">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                История заказов
              </h3>
              {customer.orders.length === 0 ? (
                <p className="text-muted-foreground">Заказов пока нет</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {customer.orders.map((order) => (
                    <li key={order.id} className="flex items-center justify-between p-2">
                      <span>№{order.orderNumber}</span>
                      <span className="text-muted-foreground">{formatDateTime(order.createdAt)}</span>
                      <span>{formatMoney(order.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2 text-sm">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                История бронирований
              </h3>
              {customer.reservations.length === 0 ? (
                <p className="text-muted-foreground">Броней пока нет</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {customer.reservations.map((reservation) => (
                    <li key={reservation.id} className="flex items-center justify-between p-2">
                      <span>
                        {formatDate(reservation.date)} {reservation.time}
                      </span>
                      <span>{reservation.persons} чел.</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2 text-sm">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Заметки сотрудников
              </h3>
              {customer.notes.length === 0 ? (
                <p className="text-muted-foreground">Заметок пока нет</p>
              ) : (
                <ul className="space-y-2">
                  {customer.notes.map((note) => (
                    <li key={note.id} className="rounded-md border p-2">
                      <p>{note.note}</p>
                      <p className="text-muted-foreground pt-1 text-xs">
                        {note.authorName ?? '—'} · {formatDateTime(note.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <AddCustomerNoteForm customerId={customer.id} onAdded={() => reload(customer.id)} />
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
