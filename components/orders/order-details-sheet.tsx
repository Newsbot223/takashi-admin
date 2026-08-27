'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { EditOrderDialog } from '@/components/orders/edit-order-dialog';
import { MapsQrCode } from '@/components/shared/maps-qr-code';
import { CustomerDetailsSheet } from '@/components/customers/customer-details-sheet';
import { buildMapsUrl } from '@/lib/maps';
import { buildWhatsAppUrl } from '@/lib/phone';
import { toFriendlyOrderError } from '@/lib/orders/error-messages';
import { toast } from 'sonner';
import {
  getOrderDetailsAction,
  updateOrderStatusAction,
  notifyPickupReadyAction,
  type OrderDetail,
  type OrderStatusHistoryEntry,
} from '@/app/(dashboard)/orders/actions';
import type { OrderStatusOption } from '@/lib/orders/queries';

type OrderDetailsSheetProps = {
  orderId: string | null;
  statuses: OrderStatusOption[];
  /** Инкрементируется владельцем (OrdersTable), когда Realtime-событие
   *  меняет статус ИМЕННО этого открытого заказа — заставляет Sheet
   *  подтянуть свежие данные без второй подписки на Realtime. */
  refreshToken?: number;
  onClose: () => void;
};

const ORDER_TYPE_LABELS: Record<'delivery' | 'pickup', string> = {
  delivery: 'Доставка',
  pickup: 'Самовывоз',
};

const SOURCE_LABELS: Record<string, string> = {
  system: 'Система',
  admin_panel: 'Админ-панель',
  driver_app: 'Приложение водителя',
};

function formatMoney(value: number) {
  return `${value.toFixed(2)} €`;
}

function formatRequestedTime(value: string | null) {
  return value ?? 'Как можно скорее';
}

/** Отличаем конкретно выбранное клиентом время ("19:00") от ASAP-фразы
 *  ("So bald wie möglich"/"As soon as possible"/null) — та же логика,
 *  что в orderSummary.js (email) и index.html (сайт). Используется,
 *  чтобы НЕ показывать одновременно "Желаемое время: 19:00" и
 *  "Ожидаемое время: 35 Min." — это выглядит как два разных времени
 *  готовности одного заказа. */
const SPECIFIC_TIME_PATTERN = /^\d{1,2}:\d{2}$/;
function isSpecificRequestedTime(value: string | null) {
  return value !== null && SPECIFIC_TIME_PATTERN.test(value.trim());
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

export function OrderDetailsSheet({ orderId, statuses, refreshToken = 0, onClose }: OrderDetailsSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [history, setHistory] = useState<OrderStatusHistoryEntry[]>([]);
  const [allowedNextStatuses, setAllowedNextStatuses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNotifyPending, startNotifyTransition] = useTransition();
  const [notifyError, setNotifyError] = useState<string | null>(null);

  const statusLabelByKey = new Map(statuses.map((s) => [s.key, s.labelDe]));

  async function refetchOrder(id: string) {
    const refreshed = await getOrderDetailsAction(id);
    if (refreshed.ok) {
      setOrder(refreshed.order);
      setHistory(refreshed.history);
      setAllowedNextStatuses(refreshed.allowedNextStatuses);
    }
    router.refresh();
  }

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setHistory([]);
      setAllowedNextStatuses([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    getOrderDetailsAction(orderId).then((result) => {
      setIsLoading(false);
      if (!result.ok) {
        setError(toFriendlyOrderError(result.error));
        return;
      }
      setOrder(result.order);
      setHistory(result.history);
      setAllowedNextStatuses(result.allowedNextStatuses);
    });
  }, [orderId, refreshToken]);

  function handleStatusChange(newStatus: string) {
    if (!orderId) return;

    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, newStatus);
      if (!result.ok) {
        setError(toFriendlyOrderError(result.error));
        return;
      }

      await refetchOrder(orderId);
    });
  }

  /* "Заказ готов — уведомить клиента" — только для Abholung, не меняет
   *  order.status (см. actions.ts). Дедупликация на стороне
   *  takashi-backend (claim_status_email_notification), здесь только
   *  UI-состояние + refetch, чтобы pickupReadyNotifiedAt подтянулся с
   *  сервера и кнопка стала disabled после успеха. */
  function handleNotifyPickupReady() {
    if (!orderId || !order) return;

    setNotifyError(null);
    startNotifyTransition(async () => {
      const result = await notifyPickupReadyAction(order.orderNumber);

      if (!result.ok) {
        console.error('[Orders] notifyPickupReadyAction failed:', result.error);
        setNotifyError('Не удалось отправить уведомление. Попробуйте ещё раз.');
        return;
      }

      if (!result.sent) {
        // already-notified — не ошибка, просто кто-то уже успел отправить
        // (повторный клик / гонка); подтягиваем актуальное состояние.
        toast('Клиент уже был уведомлён.');
        await refetchOrder(orderId);
        return;
      }

      toast('Клиент уведомлён.');
      await refetchOrder(orderId);
    });
  }

  const mapsUrl = order
    ? buildMapsUrl(order.deliveryAddress, order.deliveryLat, order.deliveryLng)
    : null;
  const regularNextStatuses = allowedNextStatuses.filter((status) => status !== 'cancelled');
  const canCancel = allowedNextStatuses.includes('cancelled');

  return (
    <>
      <Sheet open={orderId !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="overflow-y-auto sm:max-w-xl print:static print:h-auto print:w-full print:max-w-none print:overflow-visible print:border-none print:shadow-none">
          {isLoading ? (
            <div className="text-muted-foreground p-4 text-sm">Загрузка…</div>
          ) : error && !order ? (
            <div className="text-destructive p-4 text-sm">{error}</div>
          ) : order ? (
            <div className="flex flex-col gap-6 p-4">
              <SheetHeader className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <SheetTitle>Заказ №{order.orderNumber}</SheetTitle>
                    <SheetDescription>{formatDateTime(order.createdAt)}</SheetDescription>
                  </div>
                  <div className="flex gap-2 print:hidden">
                    {order.status !== 'delivered' && order.status !== 'cancelled' ? (
                      <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                        Редактировать
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      Печать
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge
                  status={order.status}
                  label={statusLabelByKey.get(order.status) ?? order.status}
                />
                <span className="text-muted-foreground text-xs">
                  {ORDER_TYPE_LABELS[order.orderType]}
                  {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
                </span>
              </div>

              {/* Желаемое клиентом время ("Wunschzeit") — то же значение, что
                  уже видно в Telegram. Отдельно от estimatedTime ниже (это
                  расчётная оценка длительности, "35 Min.", другая величина). */}
              <p className="text-sm">
                <span className="text-muted-foreground">Желаемое время: </span>
                <span className="font-medium">{formatRequestedTime(order.requestedTime)}</span>
              </p>

              {order.orderType === 'pickup' ? (
                <div className="space-y-1 print:hidden">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isNotifyPending || Boolean(order.pickupReadyNotifiedAt)}
                    onClick={handleNotifyPickupReady}
                    className="w-fit"
                  >
                    {order.pickupReadyNotifiedAt
                      ? 'Клиент уведомлён'
                      : isNotifyPending
                        ? 'Отправка…'
                        : 'Заказ готов — уведомить клиента'}
                  </Button>
                  {notifyError ? <p className="text-destructive text-xs">{notifyError}</p> : null}
                </div>
              ) : null}

              <section className="space-y-1 text-sm">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Клиент
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(order.customerId)}
                  className="text-left font-medium underline-offset-2 hover:underline"
                >
                  {order.customerName}
                </button>
                <p>{order.customerPhone}</p>
                {order.customerEmail ? <p>{order.customerEmail}</p> : null}
                <div className="flex flex-wrap gap-2 pt-1 print:hidden">
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${order.customerPhone}`}>Позвонить</a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href={buildWhatsAppUrl(order.customerPhone)} target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                  </Button>
                </div>
              </section>

              {order.orderType === 'delivery' ? (
                <section className="space-y-2 text-sm">
                  <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Адрес доставки
                  </h3>
                  {order.deliveryAddress ? <p>{order.deliveryAddress}</p> : null}
                  {order.deliveryZone ? <p className="text-muted-foreground">{order.deliveryZone}</p> : null}
                  {order.estimatedTime && !isSpecificRequestedTime(order.requestedTime) ? (
                    <p>Ожидаемое время: {order.estimatedTime}</p>
                  ) : null}
                  {mapsUrl ? (
                    <div className="flex items-center gap-3 pt-1 print:hidden">
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
                  Товары
                </h3>
                <div className="divide-y rounded-md border">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-2 p-2">
                      <div>
                        <div>
                          {item.qty}× {item.name}
                          {item.variant ? ` (${item.variant})` : ''}
                        </div>
                        {item.comment ? (
                          <div className="text-muted-foreground text-xs italic">{item.comment}</div>
                        ) : null}
                      </div>
                      <div className="whitespace-nowrap">{formatMoney(item.lineTotal)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Подытог</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                {order.discount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Скидка</span>
                    <span>−{formatMoney(order.discount)}</span>
                  </div>
                ) : null}
                {order.deliveryFee > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Доставка</span>
                    <span>{formatMoney(order.deliveryFee)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-medium">
                  <span>Итого</span>
                  <span>{formatMoney(order.total)}</span>
                </div>
              </section>

              {order.comment ? (
                <section className="space-y-1 text-sm">
                  <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Комментарий клиента
                  </h3>
                  <p>{order.comment}</p>
                </section>
              ) : null}

              <section className="space-y-2 text-sm">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  История статусов
                </h3>
                <ul className="space-y-1">
                  {history.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between text-xs">
                      <span>{statusLabelByKey.get(entry.status) ?? entry.status}</span>
                      <span className="text-muted-foreground">
                        {formatDateTime(entry.createdAt)} ·{' '}
                        {entry.changedByName ?? SOURCE_LABELS[entry.source] ?? entry.source}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {regularNextStatuses.length > 0 ? (
                <section className="space-y-2 print:hidden">
                  <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Изменить статус
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {regularNextStatuses.map((statusKey) => (
                      <Button
                        key={statusKey}
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleStatusChange(statusKey)}
                      >
                        {statusLabelByKey.get(statusKey) ?? statusKey}
                      </Button>
                    ))}
                  </div>
                </section>
              ) : null}

              {canCancel ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleStatusChange('cancelled')}
                  className="w-fit print:hidden"
                >
                  Отменить заказ
                </Button>
              ) : null}

              {error ? <p className="text-destructive text-sm">{error}</p> : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {order ? (
        <EditOrderDialog
          order={order}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={() => orderId && refetchOrder(orderId)}
        />
      ) : null}

      <CustomerDetailsSheet customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
    </>
  );
}
