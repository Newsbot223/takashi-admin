import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export type StaffRole = 'admin' | 'staff' | 'driver';

export type CurrentStaff = {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
};

/**
 * Единая точка проверки доступа к (dashboard).
 * Вызывается один раз в app/(dashboard)/layout.tsx — защищает все
 * вложенные маршруты сразу, без повторения проверки в каждой странице.
 *
 * Редиректит на /login, если:
 *  - нет авторизованного пользователя;
 *  - для пользователя нет записи в staff;
 *  - staff.is_active = false.
 */
export async function requireStaff(): Promise<CurrentStaff> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, full_name, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!staffRow || !staffRow.is_active) {
    redirect('/login');
  }

  return {
    id: staffRow.id,
    email: user.email ?? '',
    fullName: staffRow.full_name,
    role: staffRow.role as StaffRole,
  };
}
