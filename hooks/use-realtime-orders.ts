'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type OrderRealtimeEvent =
  | { type: 'insert'; orderId: string; status: string }
  | { type: 'update'; orderId: string; status: string };

type OrderRow = {
  id: string;
  status: string;
};

type UseRealtimeOrdersOptions = {
  onEvent: (event: OrderRealtimeEvent) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
};

export function useRealtimeOrders({
  onEvent,
  onStatusChange,
}: UseRealtimeOrdersOptions) {
  const router = useRouter();

  const onEventRef = useRef(onEvent);
  const onStatusChangeRef = useRef(onStatusChange);

  onEventRef.current = onEvent;
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    const supabase = createClient();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let hasDisconnectedOnce = false;
    let cancelled = false;

    onStatusChangeRef.current?.('connecting');

    const setupRealtime = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError) {
        console.error('❌ Supabase session error:', sessionError);
        onStatusChangeRef.current?.('disconnected');
        return;
      }

      if (!session?.access_token) {
        console.error('❌ No Supabase Auth session / access token');
        onStatusChangeRef.current?.('disconnected');
        return;
      }

      // Явно передаём JWT в Realtime.
      supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
          },
          (payload) => {

            const row = payload.new as OrderRow;

            if (!row?.id) {
              console.error(
                '❌ Realtime INSERT пришёл без id:',
                payload
              );
              return;
            }

            onEventRef.current({
              type: 'insert',
              orderId: row.id,
              status: row.status,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
          },
          (payload) => {

            const row = payload.new as OrderRow;

            if (!row?.id) {
              console.error(
                '❌ Realtime UPDATE пришёл без id:',
                payload
              );
              return;
            }

            onEventRef.current({
              type: 'update',
              orderId: row.id,
              status: row.status,
            });
          }
        )
        .subscribe((status) => {
          console.log('📡 Realtime status:', status);

          if (status === 'SUBSCRIBED') {
            onStatusChangeRef.current?.('connected');

            if (hasDisconnectedOnce) {
              hasDisconnectedOnce = false;
              router.refresh();
            }
          } else if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT'
          ) {
            hasDisconnectedOnce = true;
            onStatusChangeRef.current?.('disconnected');
          } else if (status === 'CLOSED') {
            onStatusChangeRef.current?.('disconnected');
          }
        });
    };

    setupRealtime();

    return () => {
      cancelled = true;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}