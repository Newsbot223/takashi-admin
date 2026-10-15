'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Lädt die Server-Daten der Seite regelmäßig neu (nur wenn der Tab sichtbar ist). */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, seconds * 1000);
    const onVisible = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router, seconds]);

  return null;
}
