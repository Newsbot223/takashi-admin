/**
 * Ссылка на Google Maps: точный маршрут по координатам, если они
 * есть, иначе — поиск по тексту адреса. Координаты сейчас всегда
 * NULL (см. миграцию 009) — сайт пока не передаёт их при оформлении
 * заказа, поэтому текстовый фолбэк — основной рабочий путь.
 */
export function buildMapsUrl(
  address: string | null,
  lat: number | null,
  lng: number | null,
): string | null {
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (address) {
    return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  }
  return null;
}
