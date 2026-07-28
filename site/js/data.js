/**
 * Data access.
 *
 * Clients read our published snapshots and nothing else — no third-party price
 * API is ever called from the browser (DECISIONS 0007). One scheduled job
 * fetches prices for everyone, which keeps data cost flat no matter how many
 * people are playing.
 */

const DATA_ROOT = new URL('../data/', import.meta.url);

async function loadJSON(name) {
  const res = await fetch(new URL(name, DATA_ROOT), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load ${name} (${res.status})`);
  return res.json();
}

export async function loadSlate() {
  return loadJSON('slate.json');
}

export async function loadSnapshot() {
  return loadJSON('snapshot.json');
}

export async function loadConfig() {
  try {
    return await loadJSON('config.json');
  } catch {
    return {};
  }
}

export async function loadHistory() {
  try {
    return await loadJSON('history.json');
  } catch {
    return { contests: [] };
  }
}

/** Everything a view needs, in one call. */
export async function loadAll() {
  const [slate, snapshot, history, config] = await Promise.all([
    loadSlate(),
    loadSnapshot(),
    loadHistory(),
    loadConfig(),
  ]);
  return { slate, snapshot, history, config };
}

/**
 * Close prices for scoring: live prices while the contest runs, and the
 * archived settlement snapshot once it has closed.
 */
export function closePrices(slate, snapshot) {
  if (slate.settledPrices) return slate.settledPrices;
  const out = {};
  for (const id of slate.tokens) {
    out[id] = snapshot.tokens[id]?.price ?? slate.openPrices[id];
  }
  return out;
}

/** Prior-24h change per token, as ghosts saw it at contest open. */
export function openMeta(slate) {
  return slate.openMeta ?? {};
}
