import { redirect } from 'next/navigation';

/** Startseite → direkt ins Dashboard. Wer nicht eingeloggt ist, wird dort
 *  von requireStaff() automatisch zur Login-Seite weitergeleitet. */
export default function RootPage() {
  redirect('/dashboard');
}
