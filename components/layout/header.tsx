import { logout } from '@/app/(dashboard)/actions';
import { Button } from '@/components/ui/button';
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
    <header className="bg-background flex h-14 shrink-0 items-center justify-end gap-4 border-b px-6 print:hidden">
      <div className="text-right leading-tight">
        <div className="text-sm font-medium">{fullName}</div>
        <div className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</div>
      </div>

      <form action={logout}>
        <Button type="submit" variant="outline" size="sm">
          Выйти
        </Button>
      </form>
    </header>
  );
}
