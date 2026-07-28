/**
 * Email capture.
 *
 * The owned list is the real asset here — a channel that survives an algorithm
 * change, a suspension, or a platform deciding it no longer likes this kind of
 * app. Everything else on this site is rented attention.
 *
 * The ask lands right after picks are locked, which is the moment the player
 * has something they want the outcome of. The exchange is honest and concrete:
 * an address for a result, not "updates".
 *
 * Zero-infrastructure: posts to whatever endpoint is configured in
 * data/config.json (Formspree, Buttondown, a Google Form, anything that takes a
 * POST). With no endpoint configured it stores locally and says so rather than
 * pretending it sent.
 */

import { getState } from './state.js';

const KEY = 'cutline.emails.v1';

export function isValidEmail(value) {
  const trimmed = String(value ?? '').trim();
  // Deliberately permissive. Bouncing a real address to look rigorous costs
  // far more than accepting one that later hard-bounces.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) && trimmed.length <= 254;
}

export function storedEmail() {
  return getState().email ?? null;
}

function queueLocally(record) {
  try {
    const queue = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    queue.push(record);
    localStorage.setItem(KEY, JSON.stringify(queue.slice(-50)));
  } catch {
    /* storage unavailable — the address is still held in app state */
  }
}

/**
 * Submit an address. Returns `{ ok, delivered, message }`.
 * `delivered` is false when it was only queued locally, so the caller can be
 * truthful about what actually happened.
 */
export async function submitEmail(email, config, context = {}) {
  const address = String(email ?? '').trim().toLowerCase();
  if (!isValidEmail(address)) {
    return { ok: false, delivered: false, message: 'That address does not look right' };
  }

  const record = {
    email: address,
    contestId: context.contestId ?? null,
    picks: context.picks ?? null,
    at: new Date().toISOString(),
    source: 'cutline-web',
  };

  const endpoint = config?.emailEndpoint;
  if (!endpoint) {
    queueLocally(record);
    return { ok: true, delivered: false, message: "Saved on this device — you're on the list" };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(String(res.status));
    return { ok: true, delivered: true, message: "You're on the list" };
  } catch {
    // Never lose the address to a network blip.
    queueLocally(record);
    return { ok: true, delivered: false, message: "Saved — we'll retry sending" };
  }
}

/** Addresses captured while offline or unconfigured, for later export. */
export function pendingQueue() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
