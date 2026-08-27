/**
 * Bridge from the Admin Dashboard's "Bestellung fertig — Kunde
 * benachrichtigen" button to takashi-backend's api/notify-pickup-ready.js
 * — mirrors lib/orders/notify-status-email.ts's fetch shape, but unlike
 * that file this one is NOT fire-and-forget/never-throws: the button
 * needs the real result (sent / already-notified / failed) to show the
 * right UI state, so this returns a discriminated result instead of void.
 *
 * Server-only by construction: read only from app/(dashboard)/orders/actions.ts
 * ('use server'), so never bundled to the browser. Do NOT rename either
 * env var with a NEXT_PUBLIC_ prefix.
 *
 *   NOTIFY_PICKUP_READY_ENDPOINT_URL  e.g. https://telegram-bot-token-2.vercel.app/api/notify-pickup-ready
 *   NOTIFY_STATUS_ENDPOINT_SECRET     reused as-is from the existing
 *                                       notify-status.js integration —
 *                                       same trust boundary (this
 *                                       Server Action is the only
 *                                       caller of either endpoint), so
 *                                       no new secret was introduced.
 */
export type NotifyPickupReadyResult =
  | { ok: true; sent: true }
  | { ok: true; sent: false; reason: string }
  | { ok: false; error: string };

export async function notifyPickupReady(orderNumber: string): Promise<NotifyPickupReadyResult> {
  const url = process.env.NOTIFY_PICKUP_READY_ENDPOINT_URL;
  const secret = process.env.NOTIFY_STATUS_ENDPOINT_SECRET;

  if (!url || !secret) {
    console.error('[Orders] NOTIFY_PICKUP_READY_ENDPOINT_URL/NOTIFY_STATUS_ENDPOINT_SECRET not configured');
    return { ok: false, error: 'Benachrichtigung ist nicht konfiguriert.' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ orderNumber }),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.ok) {
      console.error('[Orders] notify-pickup-ready endpoint returned an error:', response.status, result);
      return { ok: false, error: (result && result.error) || 'Server hat mit einem Fehler geantwortet.' };
    }

    if (result.sent === false) {
      return { ok: true, sent: false, reason: result.reason ?? result.error ?? 'unbekannt' };
    }

    return { ok: true, sent: true };
  } catch (err) {
    console.error(`[Orders] notify-pickup-ready request failed for ${orderNumber} —`, err);
    return { ok: false, error: 'Anfrage fehlgeschlagen — bitte erneut versuchen.' };
  } finally {
    clearTimeout(timeoutId);
  }
}
