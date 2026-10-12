import type { Metadata } from 'next';
import './globals.css';
import { ADMIN_TITLE, RESTAURANT_NAME } from '@/lib/restaurant';

export const metadata: Metadata = {
  title: ADMIN_TITLE,
  description: `Административная панель ресторана ${RESTAURANT_NAME}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning: понадобится для переключателя тёмной/светлой
  // темы (Settings, будущий этап) — безвредно уже сейчас, добавлять позже
  // отдельным изменением нет смысла.
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
