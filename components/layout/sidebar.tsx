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

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Заказы', href: '/orders', icon: ClipboardList },
  { label: 'Бронирования', href: '/reservations', icon: CalendarClock },
  { label: 'Меню', href: '/menu', icon: UtensilsCrossed, disabled: true },
  { label: 'Категории', href: '/categories', icon: Tags, disabled: true },
  { label: 'Сотрудники', href: '/staff', icon: Users },
  { label: 'Клиенты', href: '/customers', icon: UserRound },
  { label: 'Отзывы', href: '/reviews', icon: Star, disabled: true },
  { label: 'Настройки', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-card flex w-64 shrink-0 flex-col border-r print:hidden">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-sm font-semibold tracking-tight">Takashi Admin</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                title="Скоро"
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
    </aside>
  );
}
