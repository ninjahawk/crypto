/**
 * Live price feed.
 *
 * New launches are on no centralised exchange, so there is no WebSocket to
 * subscribe to — this polls public DEX aggregator REST endpoints. Both are
 * keyless, and the request is made by the *user's* browser from the user's own
 * IP, so every player brings their own rate-limit budget. Free at any number of
 * players, nothing for us to scale (DECISIONS 0020).
 *
 * Two sources with failover, deliberately on different domains. A single
 * source is a single point of failure: an ad blocker, a corporate network, a
 * regional block or an outage silently freezes every price in the app and the
 * user just sees stale numbers forever. That exact symptom is why this exists.
 *
 * Settlement is unaffected — prizes are decided against our archived snapshots,
 * never a price a client reports (DECISIONS 0006). This drives the screen only.
 */

const POLL_MS = 8000;
const BATCH = 30;

export const SOURCES = [
  {
    name: 'dexscreener',
    url: (addresses) => `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(',')}`,
    parse: parseDexScreener,
    batch: BATCH,
  },
  {
    name: 'geckoterminal',
    // Address-based multi-pool lookup, one network at a time.
    url: (addresses, network) =>
      `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/multi/${addresses.join(',')}?include=top_pools`,
    parse: parseGeckoTerminal,
    batch: 20,
    perNetwork: true,
  },
];

export function parseDexScreener(body) {
  const deepest = new Map();
  for (const pair of body?.pairs ?? []) {
    const address = String(pair?.baseToken?.address ?? '').toLowerCase();
    const price = Number(pair?.priceUsd);
    const liquidity = Number(pair?.liquidity?.usd ?? 0);
    if (!address || !Number.isFinite(price) || price <= 0) continue;

    const seen = deepest.get(address);
    if (!seen || liquidity > seen.liquidity) {
      deepest.set(address, { address, price, liquidity, ch24: Number(pair?.priceChange?.h24 ?? 0) });
    }
  }
  return [...deepest.values()];
}

export function parseGeckoTerminal(body) {
  const deepest = new Map();
  const rows = Array.isArray(body?.data) ? body.data : [];
  for (const row of rows) {
    const a = row?.attributes ?? {};
    const price = Number(a.base_token_price_usd ?? a.price_usd);
    const liquidity = Number(a.reserve_in_usd ?? 0);
    const rawId = row?.relationships?.base_token?.data?.id ?? row?.id ?? '';
    const address = String(rawId).includes('_')
      ? String(rawId).split('_').slice(1).join('_').toLowerCase()
      : String(rawId).toLowerCase();
    if (!address || !Number.isFinite(price) || price <= 0) continue;

    const seen = deepest.get(address);
    if (!seen || liquidity > seen.liquidity) {
      deepest.set(address, {
        address,
        price,
        liquidity,
        ch24: Number(a.price_change_percentage?.h24 ?? 0),
      });
    }
  }
  return [...deepest.values()];
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function createPriceFeed(tokens, onUpdate, options = {}) {
  const { fetchImpl = globalThis.fetch?.bind(globalThis), pollMs = POLL_MS } = options;

  const byAddress = new Map();
  const networkOf = new Map();
  for (const [id, token] of Object.entries(tokens)) {
    const address = token?.dex?.address;
    if (!address) continue;
    byAddress.set(address.toLowerCase(), id);
    networkOf.set(address.toLowerCase(), token.dex.network ?? 'eth');
  }

  const state = { stopped: false, live: false, lastOk: 0, timer: null, sourceIndex: 0 };
  if (byAddress.size === 0 || !fetchImpl) {
    return { stop() {}, isLive: () => false, pollNow: async () => {} };
  }

  const addresses = [...byAddress.keys()];

  async function trySource(source) {
    const groups = source.perNetwork
      ? [...new Set(addresses.map((a) => networkOf.get(a)))].map((network) => ({
          network,
          list: addresses.filter((a) => networkOf.get(a) === network),
        }))
      : [{ network: null, list: addresses }];

    // Collect first, emit once. A token can appear in more than one batch or
    // network group, and firing onUpdate twice for the same token in a single
    // poll would double-count it downstream.
    const collected = new Map();
    for (const group of groups) {
      for (const batch of chunk(group.list, source.batch)) {
        const res = await fetchImpl(source.url(batch, group.network));
        if (!res?.ok) throw new Error(`${source.name} ${res?.status ?? 'no response'}`);
        for (const row of source.parse(await res.json())) {
          const id = byAddress.get(row.address);
          if (!id) continue;
          const seen = collected.get(id);
          if (!seen || row.liquidity > seen.liquidity) collected.set(id, row);
        }
      }
    }
    for (const [id, row] of collected) onUpdate(id, row.price, row.ch24);
    return collected.size;
  }

  async function pollNow() {
    if (state.stopped) return;
    // Start from the source that worked last time, so a persistent block on the
    // primary costs one failed request per poll, not a permanent freeze.
    for (let offset = 0; offset < SOURCES.length; offset += 1) {
      const index = (state.sourceIndex + offset) % SOURCES.length;
      try {
        const matched = await trySource(SOURCES[index]);
        if (matched > 0) {
          state.sourceIndex = index;
          state.live = true;
          state.lastOk = Date.now();
          return;
        }
      } catch {
        /* try the next source */
      }
    }
    state.live = false;
  }

  async function loop() {
    await pollNow();
    if (!state.stopped) state.timer = setTimeout(loop, pollMs);
  }

  if (options.autostart !== false) loop();

  return {
    pollNow,
    stop() {
      state.stopped = true;
      clearTimeout(state.timer);
    },
    isLive: () => state.live && Date.now() - state.lastOk < pollMs * 3,
  };
}
