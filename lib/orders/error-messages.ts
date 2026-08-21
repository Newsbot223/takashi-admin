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
    return 'Недостаточно прав для этого действия.';
  }
  if (message.includes('not found')) {
    return 'Заказ не найден — возможно, он был удалён или уже недоступен.';
  }
  if (message.includes('is not allowed')) {
    return 'Такой переход статуса недопустим.';
  }
  if (message.includes('cannot edit a')) {
    return 'Нельзя редактировать завершённый заказ.';
  }
  if (message.includes('discount cannot')) {
    return 'Некорректное значение скидки.';
  }
  if (message.includes('is already')) {
    return 'Заказ уже в этом статусе.';
  }

  console.error('[Orders] Unrecognized error from Supabase:', rawMessage);
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}
