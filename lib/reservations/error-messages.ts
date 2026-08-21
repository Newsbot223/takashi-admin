/**
 * Аналог lib/orders/error-messages.ts для бронирований — сознательно
 * отдельный файл, а не общий модуль: чтобы его завести, пришлось бы
 * трогать уже отгруженный Orders (вынести общий модуль и поменять
 * оба места импорта), а это лишний риск ради небольшого файла.
 */
export function toFriendlyReservationError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes('not authorized')) {
    return 'Недостаточно прав для этого действия.';
  }
  if (message.includes('not found')) {
    return 'Бронирование не найдено — возможно, оно было удалено.';
  }
  if (message.includes('is not allowed')) {
    return 'Такой переход статуса недопустим.';
  }
  if (message.includes('cannot edit a')) {
    return 'Нельзя редактировать завершённое бронирование.';
  }
  if (message.includes('persons must be')) {
    return 'Количество гостей должно быть больше нуля.';
  }
  if (message.includes('is already')) {
    return 'Бронирование уже в этом статусе.';
  }

  console.error('[Reservations] Unrecognized error from Supabase:', rawMessage);
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}
