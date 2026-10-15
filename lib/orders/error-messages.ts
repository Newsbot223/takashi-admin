/**
 * RPC (update_order_status / update_order_details / update_order_discount)
 * бросают технические сообщения об исключениях Postgres — этот файл
 * переводит известные шаблоны в понятный оператору текст. Нераспознанное
 * сообщение не показывается как есть — уходит в консоль для отладки,
 * оператору — нейтральный текст без технических деталей.
 */
export function toFriendlyOrderError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes('not authorized')) {
    return 'Keine Berechtigung für diese Aktion.';
  }
  if (message.includes('not found')) {
    return 'Bestellung nicht gefunden – evtl. gelöscht oder nicht mehr verfügbar.';
  }
  if (message.includes('is not allowed')) {
    return 'Dieser Statuswechsel ist nicht erlaubt.';
  }
  if (message.includes('cannot edit a')) {
    return 'Eine abgeschlossene Bestellung kann nicht bearbeitet werden.';
  }
  if (message.includes('discount cannot')) {
    return 'Ungültiger Rabatt.';
  }
  if (message.includes('is already')) {
    return 'Die Bestellung hat diesen Status bereits.';
  }

  console.error('[Orders] Unrecognized error from Supabase:', rawMessage);
  return 'Aktion fehlgeschlagen. Bitte erneut versuchen.';
}
