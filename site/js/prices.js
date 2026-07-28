/**
 * Live price feed for fresh launches.
 *
 * New memecoins are not listed on any centralised exchange, so there is no
 * WebSocket to subscribe to. DexScreener's public REST endpoint is keyless and
 * takes up to 30 token addresses per call, which means one request covers the
 * whole slate.
 *
 * The request is made by the *user's* browser, from the user's IP. Every player
 * gets their own rate-limit budget, so this is free at any number of players
 * and there is nothing for us to scale. That is the same reasoning as the
 * exchange socket in DECISIONS 0020 — the cost never lands on us.
 *
 * Settlement is unchanged: prizes are decided against our archived snapshots,
 * never against a price a client reports (DECISIONS 0006). This drives the
 * screen, not the payout.
 */

const DEXSCREENER = 'https://api.dexscreener.com/latest/dex/tokens/';
const POLL_MS = 8000;
const MAX_ADDRESSES = 30;

export function createPriceFeed(tokens, onUpdate) {
  // Address → our token id. Addresses are chain-unique in practice; where a
  // collision happens the deepest pool wins on the response side anyway.
  const byAddress = new Map();
  for (const [id, token] of Object.entries(tokens)) {
    const address = token?.dex?.address;
    if (address) byAddress.set(address.toLowerCase(), id);
  }

  const state = { stopped: false, live: false, lastOk: 0, timer: null };
  if (byAddress.size === 0) return { stop() {}, isLive: () => false };

  const batches = [];
  const all = [...byAddress.keys()];
  for (let i = 0; i < all.length; i += MAX_ADDRESSES) {
    batches.push(all.slice(i, i + MAX_ADDRESSES));
  }

  async function pollOnce() {
    if (state.stopped) return;
    try {
      const responses = await Promise.all(
        batches.map((batch) =>
          fetch(DEXSCREENER + batch.join(','), { headers: { accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );

      let updated = 0;
      // One token can have many pools; the deepest is the one that prices it.
      const deepest = new Map();

      for (const body of responses) {
        for (const pair of body?.pairs ?? []) {
          const address = String(pair?.baseToken?.address ?? '').toLowerCase();
          const id = byAddress.get(address);
          const price = Number(pair?.priceUsd);
          const liquidity = Number(pair?.liquidity?.usd ?? 0);
          if (!id || !Number.isFinite(price) || price <= 0) continue;

          const seen = deepest.get(id);
          if (!seen || liquidity > seen.liquidity) {
            deepest.set(id, { price, liquidity, ch24: Number(pair?.priceChange?.h24 ?? 0) });
          }
        }
      }

      for (const [id, best] of deepest) {
        onUpdate(id, best.price, best.ch24);
        updated += 1;
      }

      if (updated > 0) {
        state.live = true;
        state.lastOk = Date.now();
      }
    } catch {
      /* a failed poll just means we keep showing the last good price */
    } finally {
      if (!state.stopped) state.timer = setTimeout(pollOnce, POLL_MS);
    }
  }

  pollOnce();

  return {
    stop() {
      state.stopped = true;
      clearTimeout(state.timer);
    },
    isLive: () => state.live && Date.now() - state.lastOk < POLL_MS * 3,
  };
}
