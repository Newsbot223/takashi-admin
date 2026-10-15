'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  UtensilsCrossed,
  Tags,
  Users,
  UserRound,
  Star,
  Settings,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Bestellungen', href: '/orders', icon: ClipboardList },
  { label: 'Reservierungen', href: '/reservations', icon: CalendarClock },
  { label: 'Speisekarte', href: '/menu', icon: UtensilsCrossed, disabled: true },
  { label: 'Kategorien', href: '/categories', icon: Tags, disabled: true },
  { label: 'Mitarbeiter', href: '/staff', icon: Users },
  { label: 'Kunden', href: '/customers', icon: UserRound },
  { label: 'Bewertungen', href: '/reviews', icon: Star, disabled: true },
  { label: 'Einstellungen', href: '/settings', icon: Settings },
];

type NavLinksProps = {
  /** Вызывается при переходе по ссылке — используется мобильным Sheet,
   *  чтобы закрыть меню сразу после выбора пункта. В десктопном
   *  сайдбаре не передаётся. */
  onNavigate?: () => void;
};

/** Общий рендер списка навигации, переиспользуется десктопным Sidebar
 *  и мобильным MobileNav (Sheet) — логика активного пункта и disabled-
 *  пунктов не должна дублироваться в двух местах. */
export function NavLinks({ onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;

        if (item.disabled) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              title="Demnächst"
              className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm"
            >
              <Icon className="size-4" />
              {item.label}
            </span>
          );
        }

        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
