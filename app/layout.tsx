import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Takashi Admin',
  description: 'Административная панель ресторана Takashi',
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
