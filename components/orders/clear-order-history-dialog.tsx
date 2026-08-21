'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  clearOrderHistoryAction,
  previewOrderHistoryCleanupAction,
} from '@/app/(dashboard)/orders/actions';
import { toFriendlyOrderError } from '@/lib/orders/error-messages';

/** "Сегодня" в локальной дате браузера (не UTC — new Date().toISOString()
 *  съехала бы на день для часовых поясов восточнее UTC вечером). Это
 *  только дефолт для поля ввода; фактическая граница "до какой даты"
 *  считается на сервере в Europe/Berlin, независимо от часового пояса
 *  браузера — см. миграцию 20260821_add_order_history_cleanup.sql. */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const PREVIEW_DEBOUNCE_MS = 350;

export function ClearOrderHistoryButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [beforeDate, setBeforeDate] = useState(getTodayDateString);
  const [count, setCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Пересчитываем предпросмотр на сервере при каждом открытии диалога и
  // каждой смене даты — количество всегда серверное, никогда не
  // фильтруется на клиенте (требование раздела 6).
  useEffect(() => {
    if (!open || !beforeDate) {
      return;
    }

    let cancelled = false;
    setIsLoadingCount(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      previewOrderHistoryCleanupAction(beforeDate).then((result) => {
        if (cancelled) return;
        setIsLoadingCount(false);
        if (!result.ok) {
          setError(toFriendlyOrderError(result.error));
          setCount(null);
          return;
        }
        setCount(result.count);
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [open, beforeDate]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Сбрасываем на дефолт при закрытии — следующее открытие всегда
      // начинается с чистого состояния, а не с даты/ошибки от прошлого раза.
      setBeforeDate(getTodayDateString());
      setCount(null);
      setError(null);
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setError(null);

    const result = await clearOrderHistoryAction(beforeDate);

    setIsDeleting(false);

    if (!result.ok) {
      setError(toFriendlyOrderError(result.error));
      return;
    }

    toast(`Удалено заказов: ${result.deletedCount}`);
    setOpen(false);
    router.refresh();
  }

  const canDelete = !isLoadingCount && !isDeleting && count !== null && count > 0;

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        className="print:hidden"
      >
        Очистить историю
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Очистить историю заказов</DialogTitle>
            <DialogDescription>
              Выберите дату. Будут удалены только завершённые и отменённые заказы до этой даты.
              Активные заказы останутся.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="clear-history-date" className="text-sm font-medium">
              Удалить заказы до
            </label>
            <Input
              id="clear-history-date"
              type="date"
              value={beforeDate}
              onChange={(event) => setBeforeDate(event.target.value)}
              max={getTodayDateString()}
            />
          </div>

          <div className="text-sm">
            {isLoadingCount ? (
              <span className="text-muted-foreground">Подсчёт…</span>
            ) : error ? (
              <span className="text-destructive">{error}</span>
            ) : count === 0 ? (
              <span className="text-muted-foreground">Заказы для удаления не найдены.</span>
            ) : count !== null ? (
              <span>
                Будет удалено: <span className="font-medium">{count}</span>{' '}
                {count === 1 ? 'заказ' : 'заказов'}
              </span>
            ) : null}
          </div>

          <p className="text-muted-foreground text-xs">
            Это действие нельзя отменить. Активные заказы (не в финальном статусе) никогда не
            затрагиваются.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={!canDelete}>
              {isDeleting ? 'Удаление…' : `Удалить ${count ?? 0} заказов`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
