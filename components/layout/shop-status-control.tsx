'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PauseCircle, PlayCircle, Timer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getShopStatusAction, setShopStatusAction } from '@/app/(dashboard)/shop-actions';
import type { ShopStatus } from '@/lib/shop/status';

const PAUSE_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: '30 Minuten', minutes: 30 },
  { label: '1 Stunde', minutes: 60 },
  { label: '2 Stunden', minutes: 120 },
  { label: 'Bis auf Weiteres', minutes: null },
];
const EXTRA_OPTIONS = [0, 15, 30, 45];

/** Pause gilt nur, solange "until" in der Zukunft liegt (oder unbegrenzt). */
function isPausedNow(s: ShopStatus) {
  if (!s.paused) return false;
  if (s.indef) return true;
  return s.untilIso ? new Date(s.untilIso).getTime() > Date.now() : false;
}

export function ShopStatusControl({ initial }: { initial: ShopStatus }) {
  const [status, setStatus] = useState<ShopStatus>(initial);
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Alle 30 s neu laden (andere Geräte / abgelaufene Pause)
  useEffect(() => {
    const id = setInterval(() => {
      force((n) => n + 1);
      getShopStatusAction().then(setStatus).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const paused = isPausedNow(status);

  function run(action: 'pause' | 'resume' | 'extra', minutes: number | null = null, extra: number | null = null, msg = '') {
    startTransition(async () => {
      const res = await setShopStatusAction(action, minutes, extra);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStatus(res.status);
      if (msg) toast(msg);
      if (action !== 'extra') setOpen(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={
          paused
            ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
            : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }
      >
        {paused ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}
        <span className="hidden sm:inline">
          {paused ? (status.until ? `Pausiert bis ${status.until}` : 'Bestellungen pausiert') : 'Bestellungen aktiv'}
        </span>
        {status.extra > 0 ? <span className="text-xs font-semibold">+{status.extra} Min.</span> : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Online-Bestellungen</DialogTitle>
            <DialogDescription>
              {paused
                ? status.until
                  ? `Pausiert – Website nimmt wieder Bestellungen an ab ${status.until} Uhr.`
                  : 'Pausiert bis auf Weiteres – die Website nimmt keine Bestellungen an.'
                : 'Aktiv – Gäste können auf der Website bestellen.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {paused ? (
              <Button
                className="w-full"
                disabled={isPending}
                onClick={() => run('resume', null, null, 'Online-Bestellungen wieder aktiv.')}
              >
                <PlayCircle className="size-4" /> Bestellungen wieder öffnen
              </Button>
            ) : null}

            <div>
              <div className="mb-2 text-sm font-medium">{paused ? 'Pause ändern' : 'Bestellungen pausieren'}</div>
              <div className="grid grid-cols-2 gap-2">
                {PAUSE_OPTIONS.map((o) => (
                  <Button
                    key={o.label}
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      run('pause', o.minutes, null, o.minutes ? `Bestellungen pausiert (${o.label}).` : 'Bestellungen pausiert.')
                    }
                  >
                    <PauseCircle className="size-4" /> {o.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Timer className="size-4" /> Wartezeit auf der Website
              </div>
              <div className="grid grid-cols-4 gap-2">
                {EXTRA_OPTIONS.map((m) => (
                  <Button
                    key={m}
                    variant={status.extra === m ? 'default' : 'outline'}
                    disabled={isPending}
                    onClick={() => run('extra', null, m, m ? `Wartezeit +${m} Min.` : 'Wartezeit normal.')}
                  >
                    {m === 0 ? 'Normal' : `+${m}`}
                  </Button>
                ))}
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Wird zur angezeigten Liefer-/Abholzeit auf der Website addiert.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
