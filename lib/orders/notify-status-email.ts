/**
 * Bridge from the Admin Dashboard to the existing, already-working
 * email system in takashi-backend (lib/email/ — notifyCustomer.js →
 * sendOrderEmail.js → providers/resend.js). This file sends nothing
 * itself; it only calls takashi-backend's thin
 * api/notify-status.js endpoint, which reuses that system as-is.
 *
 * Server-only by construction: both env vars below are read from
 * inside app/(dashboard)/orders/actions.ts, a 'use server' file, so
 * neither is ever bundled to the browser. Do NOT rename either with a
 * NEXT_PUBLIC_ prefix.
 *
 *   NOTIFY_STATUS_ENDPOINT_URL     e.g. https://telegram-bot-token-2.vercel.app/api/notify-status
 *   NOTIFY_STATUS_ENDPOINT_SECRET  shared secret, must match the same
 *                                    name in takashi-backend's env
 */

/** Source of truth for the exact wording lives in takashi-backend's
 *  lib/email/notifiableStatuses.js — this list only mirrors it so the
 *  Server Action can skip the network call entirely for statuses that
 *  would never be emailed anyway. The backend endpoint re-validates
 *  independently and is the real authority. */
const NOTIFIABLE_STATUSES = new Set(['accepted', 'on_the_way']);

export function isNotifiableStatus(status: string): boolean {
  return NOTIFIABLE_STATUSES.has(status);
}

/**
 * Calls takashi-backend/api/notify-status.js for a single order +
 * status. Deliberately awaited by the caller before the Server Action
 * returns — a serverless execution environment can be frozen right
 * after the response goes out, silently dropping an un-awaited call
 * (the same reasoning takashi-backend's order.js already documents
 * for its own email calls).
 *
 * Never throws — every failure (missing config, network error,
 * non-2xx response, timeout) is caught and logged here. Callers do
 * not need their own try/catch to stay safe, though wrapping the call
 * site anyway costs nothing and documents the guarantee locally.
 */
export async function notifyOrderStatusEmail(orderNumber: string, status: string): Promise<void> {
  const url = process.env.NOTIFY_STATUS_ENDPOINT_URL;
  const secret = process.env.NOTIFY_STATUS_ENDPOINT_SECRET;

  if (!url || !secret) {
    console.error('[Orders] NOTIFY_STATUS_ENDPOINT_URL/NOTIFY_STATUS_ENDPOINT_SECRET not configured — skipping status email');
    return;
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
      body: JSON.stringify({ orderNumber, status }),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.ok) {
      console.error('[Orders] notify-status endpoint returned an error:', response.status, result);
      return;
    }

    if (result.sent === false) {
      console.log(`[Orders] Status email for ${orderNumber}/${status} not sent:`, result.reason ?? result.error ?? 'unknown reason');
    }
  } catch (err) {
    console.error(`[Orders] notify-status request failed for ${orderNumber}/${status} —`, err);
  } finally {
    clearTimeout(timeoutId);
  }
}
