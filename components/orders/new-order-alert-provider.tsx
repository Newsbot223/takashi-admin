'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { useRealtimeOrders, type ConnectionStatus, type OrderRealtimeEvent } from '@/hooks/use-realtime-orders';
import { playNotificationSound } from '@/lib/notification-sound';

/** Заказы, ожидающие решения оператора, — тот самый статус 'new'
 *  (см. пояснение к задаче: в схеме заказов нет отдельного 'pending',
 *  это оно и есть). */
const PENDING_ORDER_STATUS = 'new';

const ALERT_SOUND_INTERVAL_MS = 5000;

type ActiveAlert = { id: string };

type AlertState = {
  activeId: string | null;
  queue: string[];
};

type NewOrderAlertContextValue = {
  connectionStatus: ConnectionStatus;
  /** Последнее сырое Realtime-событие — OrdersTable реагирует на него
   *  той же логикой, что раньше запускал прямой вызов useRealtimeOrders,
   *  просто теперь через контекст, а не собственную подписку. */
  lastEvent: OrderRealtimeEvent | null;
  activeAlert: ActiveAlert | null;
};

const NewOrderAlertContext = createContext<NewOrderAlertContextValue | null>(null);

export function useNewOrderAlertContext() {
  const ctx = useContext(NewOrderAlertContext);
  if (!ctx) {
    throw new Error('useNewOrderAlertContext must be used within NewOrderAlertProvider');
  }
  return ctx;
}

export function NewOrderAlertProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastEvent, setLastEvent] = useState<OrderRealtimeEvent | null>(null);
  const [alertState, setAlertState] = useState<AlertState>({ activeId: null, queue: [] });

  /* Единственная подписка на весь дашборд — см. app/(dashboard)/layout.tsx,
     этот провайдер монтируется там, не размонтируется при переходах между
     Dashboard/Orders/Reservations/Customers. */
  useRealtimeOrders({
    onStatusChange: setConnectionStatus,
    onEvent: (event) => {
      setLastEvent(event);

      if (event.type === 'insert' && event.status === PENDING_ORDER_STATUS) {
        setAlertState((prev) => {
          if (prev.activeId) {
            // Уже показываем один алерт — новый уходит в очередь,
            // не создаём вторую панель (требование 6).
            if (prev.queue.includes(event.orderId)) return prev;
            return { ...prev, queue: [...prev.queue, event.orderId] };
          }
          return { activeId: event.orderId, queue: prev.queue };
        });
        return;
      }

      if (event.type === 'update' && event.status !== PENDING_ORDER_STATUS) {
        // Заказ приняли (или отменили) — убираем из очереди, если он там
        // был, и если это был активный алерт — продвигаем очередь сразу
        // здесь же, одним обновлением состояния (без отдельного эффекта
        // и без риска, что "снять активный" и "показать следующий"
        // разъедутся по разным рендерам).
        setAlertState((prev) => {
          const queue = prev.queue.filter((id) => id !== event.orderId);
          if (prev.activeId === event.orderId) {
            const [next, ...rest] = queue;
            return { activeId: next ?? null, queue: rest };
          }
          if (queue.length !== prev.queue.length) {
            return { ...prev, queue };
          }
          return prev;
        });
      }
    },
  });

  /* Циклический сигнал — только пока есть активный алерт. Интервал
     создаётся и чистится в одном и том же эффекте: как только
     activeId становится null (заказ приняли), эффект перезапускается,
     возвращённая функция очистки убирает предыдущий interval, новый
     не создаётся, потому что тело эффекта сразу проверяет activeId. */
  useEffect(() => {
    if (!alertState.activeId) return;

    playNotificationSound();
    const intervalId = setInterval(playNotificationSound, ALERT_SOUND_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [alertState.activeId]);

  const activeAlert: ActiveAlert | null = alertState.activeId ? { id: alertState.activeId } : null;

  return (
    <NewOrderAlertContext.Provider value={{ connectionStatus, lastEvent, activeAlert }}>
      {children}
    </NewOrderAlertContext.Provider>
  );
}
