/**
 * Строит wa.me-ссылку из телефона клиента. Германия — основной
 * рынок ресторана (тот же допуск уже использовался в прежней
 * WhatsApp-интеграции сайта), поэтому локальный номер, начинающийся
 * с "0", трактуется как немецкий и получает код +49.
 */
export function buildWhatsAppUrl(rawPhone: string): string {
  let digits = rawPhone.replace(/[^\d+]/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('0')) {
    digits = `49${digits.slice(1)}`;
  }

  return `https://wa.me/${digits}`;
}
