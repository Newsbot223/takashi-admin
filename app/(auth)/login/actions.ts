'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations/auth';

export type LoginActionResult = { error: string } | undefined;

export async function login(values: {
  email: string;
  password: string;
}): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: 'Неверный email или пароль' };
  }

  const { data: staffRow, error: staffError } = await supabase
    .from('staff')
    .select('id, is_active')
    .eq('id', data.user.id)
    .maybeSingle();
  
    if (staffError || !staffRow || !staffRow.is_active) {
    await supabase.auth.signOut();
    return { error: 'У вас нет доступа к панели администратора' };
  }

  redirect('/dashboard');
}
