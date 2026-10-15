/**
 * Аналог lib/orders/error-messages.ts для бронирований — сознательно
 * отдельный файл, а не общий модуль: чтобы его завести, пришлось бы
 * трогать уже отгруженный Orders (вынести общий модуль и поменять
 * оба места импорта), а это лишний риск ради небольшого файла.
 */
export function toFriendlyReservationError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes('not authorized')) {
    return 'Keine Berechtigung für diese Aktion.';
  }
  if (message.includes('not found')) {
    return 'Reservierung nicht gefunden – evtl. gelöscht.';
  }
  if (message.includes('is not allowed')) {
    return 'Dieser Statuswechsel ist nicht erlaubt.';
  }
  if (message.includes('cannot edit a')) {
    return 'Eine abgeschlossene Reservierung kann nicht bearbeitet werden.';
  }
  if (message.includes('persons must be')) {
    return 'Die Anzahl der Gäste muss größer als null sein.';
  }
  if (message.includes('is already')) {
    return 'Die Reservierung hat diesen Status bereits.';
  }

  console.error('[Reservations] Unrecognized error from Supabase:', rawMessage);
  return 'Aktion fehlgeschlagen. Bitte erneut versuchen.';
}
