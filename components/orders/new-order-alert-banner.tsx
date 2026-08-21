'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useNewOrderAlertContext } from '@/components/orders/new-order-alert-provider';
import { fetchOrderListItem } from '@/lib/orders/fetch-order-list-item';
import type { OrderListItem } from '@/lib/orders/queries';

export function NewOrderAlertBanner() {
  const router = useRouter();
  const { activeAlert } = useNewOrderAlertContext();
  const [orderInfo, setOrderInfo] = useState<OrderListItem | null>(null);

  useEffect(() => {
    if (!activeAlert) {
      setOrderInfo(null);
      return;
    }

    let cancelled = false;
    fetchOrderListItem(activeAlert.id).then((item) => {
      if (!cancelled) setOrderInfo(item);
    });

    return () => {
      cancelled = true;
    };
  }, [activeAlert]);

  if (!activeAlert) {
    return null;
  }

  function handleOpen() {
    if (!activeAlert) return;
    // Работает одинаково независимо от текущей страницы (требование 5):
    // если оператор не на /orders — это полноценный переход; если уже
    // там — мягкая навигация, OrdersTable подхватит ?open= сам.
    router.push(`/orders?open=${activeAlert.id}`);
  }

  return (
    <div
      role="alert"
      className="animate-alert-blink fixed inset-x-0 top-0 z-[100] flex flex-wrap items-center justify-between gap-3 bg-red-600 px-6 py-3 text-white shadow-lg print:hidden"
    >
      <span className="font-semibold">
        🔴 НОВЫЙ ЗАКАЗ {orderInfo ? `№${orderInfo.orderNumber}` : '…'} — Ожидает подтверждения
      </span>
      <Button size="sm" variant="secondary" onClick={handleOpen}>
        Открыть заказ
      </Button>
    </div>
  );
}
