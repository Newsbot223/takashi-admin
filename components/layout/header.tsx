import { logout } from '@/app/(dashboard)/actions';
import { Button } from '@/components/ui/button';
import { MobileNav } from '@/components/layout/mobile-nav';
import type { StaffRole } from '@/lib/auth/require-staff';

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Администратор',
  staff: 'Сотрудник',
  driver: 'Водитель',
};

type HeaderProps = {
  fullName: string;
  role: StaffRole;
};

export function Header({ fullName, role }: HeaderProps) {
  return (
    <header className="bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6 print:hidden">
      <MobileNav />

      <div className="ml-auto flex items-center gap-4">
        <div className="text-right leading-tight">
          <div className="text-sm font-medium">{fullName}</div>
          <div className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</div>
        </div>

        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Выйти
          </Button>
        </form>
      </div>
    </header>
  );
}
