import { logout } from '@/app/(dashboard)/actions';
import { Button } from '@/components/ui/button';
import { MobileNav } from '@/components/layout/mobile-nav';
import type { StaffRole } from '@/lib/auth/require-staff';
import { ShopStatusControl } from '@/components/layout/shop-status-control';
import type { ShopStatus } from '@/lib/shop/status';

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrator',
  staff: 'Mitarbeiter',
  driver: 'Fahrer',
};

type HeaderProps = {
  fullName: string;
  role: StaffRole;
  shopStatus: ShopStatus;
};

export function Header({ fullName, role, shopStatus }: HeaderProps) {
  return (
    <header className="bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6 print:hidden">
      <MobileNav />
      <ShopStatusControl initial={shopStatus} />

      <div className="ml-auto flex items-center gap-4">
        <div className="text-right leading-tight">
          <div className="text-sm font-medium">{fullName}</div>
          <div className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</div>
        </div>

        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Abmelden
          </Button>
        </form>
      </div>
    </header>
  );
}
