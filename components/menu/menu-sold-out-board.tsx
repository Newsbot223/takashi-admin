'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getMenuItemsAction, setItemSoldOutAction } from '@/app/(dashboard)/menu/actions';
import type { MenuItem, SoldOutMode } from '@/lib/menu/items';

type Group = { cat: string; title: string; items: MenuItem[] };

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function MenuSoldOutBoard({ initial }: { initial: MenuItem[] }) {
  const [items, setItems] = useState<MenuItem[]>(initial);
  const [query, setQuery] = useState('');
  const [onlySoldOut, setOnlySoldOut] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Alle 60 s neu laden (Änderungen von anderen Geräten, Tageswechsel)
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      getMenuItemsAction()
        .then((fresh) => {
          if (fresh) setItems(fresh);
        })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const soldOutCount = items.filter((i) => i.soldOut).length;

  const groups = useMemo<Group[]>(() => {
    const q = normalize(query.trim());
    const out: Group[] = [];
    for (const item of items) {
      if (onlySoldOut && !item.soldOut) continue;
      if (q && !normalize(`${item.no} ${item.name} ${item.catTitle}`).includes(q)) continue;
      let g = out.find((x) => x.cat === item.cat);
      if (!g) {
        g = { cat: item.cat, title: item.catTitle, items: [] };
        out.push(g);
      }
      g.items.push(item);
    }
    return out;
  }, [items, query, onlySoldOut]);

  function setMode(item: MenuItem, mode: SoldOutMode) {
    setBusyKey(item.key);
    startTransition(async () => {
      const res = await setItemSoldOutAction(item.key, mode);
      setBusyKey(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setItems((prev) =>
        prev.map((x) =>
          x.key === item.key ? { ...x, soldOut: res.soldOut.includes(x.key), indef: mode === 'indef' } : x,
        ),
      );
      if (mode === 'off') toast.success(`${item.name} ist wieder bestellbar`);
      else if (mode === 'today') toast.success(`${item.name}: heute ausverkauft`);
      else toast.success(`${item.name}: ausverkauft bis auf Weiteres`);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gericht oder Nummer suchen"
            className="pl-8"
          />
        </div>
        <Button
          variant={onlySoldOut ? 'default' : 'outline'}
          size="sm"
          onClick={() => setOnlySoldOut((v) => !v)}
          className="sm:ml-auto"
        >
          <Ban />
          Ausverkauft ({soldOutCount})
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {onlySoldOut ? 'Zurzeit ist nichts ausverkauft.' : 'Keine Gerichte gefunden.'}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.cat} className="space-y-2">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{group.title}</h2>
          <div className="divide-y rounded-lg border">
            {group.items.map((item) => {
              const busy = busyKey === item.key;
              return (
                <div
                  key={item.key}
                  className={cn(
                    'flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4',
                    item.soldOut && 'bg-destructive/5',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-muted-foreground w-10 shrink-0 font-mono text-xs">{item.no}</span>
                    <span className={cn('truncate font-medium', item.soldOut && 'text-muted-foreground line-through')}>
                      {item.name}
                    </span>
                    {item.price && (
                      <span className="text-muted-foreground shrink-0 text-xs">{item.price} €</span>
                    )}
                    {item.soldOut && (
                      <Badge variant="destructive" className="shrink-0">
                        {item.indef ? 'Ausverkauft' : 'Heute ausverkauft'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 sm:justify-end">
                    {item.soldOut ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode(item, 'off')}>
                        <CheckCircle2 />
                        Wieder verfügbar
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setMode(item, 'today')}
                          className="hover:border-destructive/50 hover:text-destructive"
                        >
                          <Ban />
                          Heute ausverkauft
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setMode(item, 'indef')}
                          className="text-muted-foreground"
                        >
                          Bis auf Weiteres
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
