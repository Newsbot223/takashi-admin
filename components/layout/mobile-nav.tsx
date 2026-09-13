'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NavLinks } from '@/components/layout/nav-links';

/** Гамбургер-меню для мобильных экранов — открывает тот же список
 *  навигации, что и десктопный Sidebar (скрытый на мобильном, см.
 *  components/layout/sidebar.tsx), в выезжающей слева панели. Пункт
 *  меню закрывает панель сразу при переходе (onNavigate). */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Открыть меню"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <SheetContent side="left" className="w-3/4 p-0 sm:max-w-xs">
        <SheetHeader className="border-b">
          <SheetTitle>Takashi Admin</SheetTitle>
        </SheetHeader>
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
