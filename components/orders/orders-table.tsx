'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { OrderDetailsSheet } from '@/components/orders/order-details-sheet';
import { useNewOrderAlertContext } from '@/components/orders/new-order-alert-provider';
import { fetchOrderListItem } from '@/lib/orders/fetch-order-list-item';
import { playNotificationSound } from '@/lib/notification-sound';
import type { OrderListItem, OrderStatusOption } from '@/lib/orders/queries';

type OrdersTableProps = {
  orders: OrderListItem[];
  statuses: OrderStatusOption[];
  /** Текущие значения фильтров из URL — нужны, чтобы решить, попадает
   *  ли новый заказ в видимый список, и чтобы различать два состояния
   *  "пусто" (нет заказов вообще vs. ничего не найдено под фильтр). */
  search?: string;
  status?: string;
};

const ORDER_TYPE_LABELS: Record<OrderListItem['orderType'], string> = {
  delivery: 'Доставка',
  pickup: 'Самовывоз',
};

const HIGHLIGHT_DURATION_MS = 4000;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: number) {
  return `${value.toFixed(2)} €`;
}

/** requestedTime — то, что клиент реально выбрал на сайте ("Wunschzeit"),
 *  ровно то же значение, что уже видно в Telegram. null означает, что
 *  клиент ничего не выбрал (заказ "как можно скорее") — не путать с
 *  каким-то ещё "пустым" временем, подставлять текущее время нельзя. */
function formatRequestedTime(value: string | null) {
  return value ?? 'Как можно скорее';
}

export function OrdersTable({ orders: initialOrders, statuses, search, status }: OrdersTableProps) {
  const searchParams = useSearchParams();
  const { connectionStatus, lastEvent } = useNewOrderAlertContext();

  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsRefreshToken, setDetailsRefreshToken] = useState(0);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Серверные данные (после навигации: смена фильтра/поиска/сортировки/
  // страницы, либо router.refresh() после разрыва Realtime) — всегда
  // источник истины, локальный стейт синхронизируется с ними заново.
  // Между такими навигациями список патчится точечно, см. ниже.
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  /* Открытие конкретного заказа по кнопке "Открыть заказ" в баннере
     нового заказа — работает и когда переход был с другой страницы
     (полный маунт), и когда баннер нажали уже находясь на /orders
     (searchParams меняются мягкой навигацией, эффект отрабатывает
     на изменение значения параметра). */
  const openOrderId = searchParams.get('open');
  useEffect(() => {
    if (openOrderId) {
      setSelectedOrderId(openOrderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openOrderId]);

  /* Единственная подписка на Realtime для всего дашборда живёт в
     NewOrderAlertProvider (app/(dashboard)/layout.tsx) — здесь просто
     читаем поток событий из контекста и реагируем той же логикой,
     что раньше запускал прямой вызов useRealtimeOrders(). Сам хук не
     переписан ни строкой, просто вызывается из одного места. */
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'insert') {
      void handleInsert(lastEvent.orderId, lastEvent.status);
    } else {
      handleUpdate(lastEvent.orderId, lastEvent.status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  async function handleInsert(orderId: string, incomingStatus: string) {
    const item = await fetchOrderListItem(orderId);
    if (!item) return;

    playNotificationSound();
    toast(`Новый заказ №${item.orderNumber}`, {
      description: `${item.customerName} · ${formatMoney(item.total)}`,
    });

    // Активный текстовый поиск на клиенте не проверяем — это означало
    // бы повторить ilike-логику getOrders() отдельным кодом. Если поиск
    // активен, просто не вставляем строку (уведомление уже показано).
    // Соответствие фильтру по статусу, наоборот, можно проверить точно —
    // это не бизнес-логика, а прямое сравнение строк.
    const passesStatusFilter = !status || status === incomingStatus;
    if (search || !passesStatusFilter) return;

    setOrders((prev) => [item, ...prev]);
    setHighlightedIds((prev) => new Set(prev).add(orderId));
    setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }, HIGHLIGHT_DURATION_MS);
  }

  function handleUpdate(orderId: string, newStatus: string) {
    setOrders((prev) => {
      const index = prev.findIndex((order) => order.id === orderId);
      if (index === -1) return prev; // заказ не в текущей выборке — ничего не делаем

      if (status && status !== newStatus) {
        // перестал соответствовать активному фильтру статуса — убираем
        return prev.filter((order) => order.id !== orderId);
      }

      const next = [...prev];
      next[index] = { ...next[index], status: newStatus };
      return next;
    });

    if (orderId === selectedOrderId) {
      setDetailsRefreshToken((token) => token + 1);
    }
  }

  const statusLabelByKey = new Map(statuses.map((s) => [s.key, s.labelDe]));
  const hasActiveFilters = Boolean(search || status);

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs print:hidden">
        <span
          className={
            connectionStatus === 'connected'
              ? 'size-1.5 rounded-full bg-green-500'
              : connectionStatus === 'connecting'
                ? 'size-1.5 animate-pulse rounded-full bg-amber-500'
                : 'size-1.5 rounded-full bg-red-500'
          }
        />
        {connectionStatus === 'connected'
          ? 'Live'
          : connectionStatus === 'connecting'
            ? 'Подключение…'
            : 'Нет соединения — переподключение…'}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>№ заказа</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Желаемое время</TableHead>
            <TableHead>Создан</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                {hasActiveFilters ? (
                  <div className="space-y-2">
                    <p>Ничего не найдено</p>
                    <Button asChild variant="outline" size="sm">
                      <a href="/orders">Сбросить фильтры</a>
                    </Button>
                  </div>
                ) : (
                  <p>Заказов пока нет — они появятся здесь автоматически</p>
                )}
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow
                key={order.id}
                role="button"
                tabIndex={0}
                className={
                  'cursor-pointer transition-colors duration-1000 ' +
                  (highlightedIds.has(order.id) ? 'bg-amber-50' : '')
                }
                onClick={() => setSelectedOrderId(order.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedOrderId(order.id);
                  }
                }}
              >
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell>{order.customerPhone}</TableCell>
                <TableCell>{ORDER_TYPE_LABELS[order.orderType]}</TableCell>
                <TableCell>
                  <OrderStatusBadge
                    status={order.status}
                    label={statusLabelByKey.get(order.status) ?? order.status}
                  />
                </TableCell>
                <TableCell>{formatMoney(order.total)}</TableCell>
                <TableCell>{formatRequestedTime(order.requestedTime)}</TableCell>
                <TableCell>{formatDateTime(order.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <OrderDetailsSheet
        orderId={selectedOrderId}
        statuses={statuses}
        refreshToken={detailsRefreshToken}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
