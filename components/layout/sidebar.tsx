import { NavLinks } from '@/components/layout/nav-links';

/** Только десктоп — на мобильном/планшете навигация открывается через
 *  MobileNav (гамбургер в Header), см. components/layout/mobile-nav.tsx. */
export function Sidebar() {
  return (
    <aside className="bg-card hidden w-64 shrink-0 flex-col border-r md:flex print:hidden">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-sm font-semibold tracking-tight">Takashi Admin</span>
      </div>

      <NavLinks />
    </aside>
  );
}
