/**
 * Fresh memecoin slate builder.
 *
 * The product is getting in on new launches without risking real money, so the
 * universe has to be *actually new* — not blue chips. GeckoTerminal's public
 * endpoints are keyless and return pools created seconds ago.
 *
 * Curation is the entire editorial job here. Raw `new_pools` is overwhelmingly
 * sub-$2k-liquidity rugs and honeypots that never trade twice; shipping that
 * unfiltered would make the contest a coin flip and the app a shill vector.
 * The filters below are what turn a firehose into a slate.
 */

const GT = 'https://api.geckoterminal.com/api/v2';
const NETWORKS = ['solana', 'base', 'bsc', 'eth'];

/** A launch has to have cleared these to be worth putting in front of anyone. */
export const FILTERS = {
  minLiquidityUsd: 20_000,   // below this a single sell moves the price 40%
  minVolume24Usd: 15_000,    // proves someone other than the deployer is trading
  minAgeMinutes: 30,         // survive the instant-rug window
  maxAgeDays: 21,            // after three weeks it is not a new launch
  minTxns24: 100,            // filters wash-traded volume from two wallets
};

async function getJSON(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function parsePool(pool, network) {
  const a = pool.attributes ?? {};
  const price = Number(a.base_token_price_usd);
  const liquidity = Number(a.reserve_in_usd);
  const volume = Number(a.volume_usd?.h24 ?? 0);
  const createdAt = Date.parse(a.pool_created_at);
  const buys = Number(a.transactions?.h24?.buys ?? 0);
  const sells = Number(a.transactions?.h24?.sells ?? 0);

  const baseId = pool.relationships?.base_token?.data?.id ?? '';
  const address = baseId.includes('_') ? baseId.split('_').slice(1).join('_') : baseId;
  const [symbol] = String(a.name ?? '').split(' / ');

  return {
    id: `${network}:${address}`,
    address,
    network,
    poolAddress: a.address,
    sym: (symbol ?? '?').trim(),
    name: (symbol ?? '?').trim(),
    price,
    mc: Number(a.fdv_usd ?? 0) || null,
    ch24: Number(a.price_change_percentage?.h24 ?? 0),
    liquidity,
    volume,
    txns: buys + sells,
    createdAt,
    ageHours: Number.isFinite(createdAt) ? (Date.now() - createdAt) / 3600000 : null,
  };
}

function passes(t) {
  if (!Number.isFinite(t.price) || t.price <= 0) return false;
  if (!t.address || !t.sym || t.sym === '?') return false;
  if (t.liquidity < FILTERS.minLiquidityUsd) return false;
  if (t.volume < FILTERS.minVolume24Usd) return false;
  if (t.txns < FILTERS.minTxns24) return false;
  if (t.ageHours == null) return false;
  if (t.ageHours < FILTERS.minAgeMinutes / 60) return false;
  if (t.ageHours > FILTERS.maxAgeDays * 24) return false;
  // Liquidity far below daily volume means the pool cannot absorb the flow it
  // claims — the classic wash-trade signature.
  if (t.volume > t.liquidity * 200) return false;
  return true;
}

/**
 * Pull new and trending pools across networks and return the survivors,
 * hottest first. `new_pools` supplies genuine freshness; `trending_pools`
 * catches the ones already running that people are actually talking about.
 */
export async function fetchFreshTokens({ limit = 24 } = {}) {
  const requests = [];
  for (const network of NETWORKS) {
    for (const page of [1, 2]) {
      requests.push(
        getJSON(`${GT}/networks/${network}/new_pools?page=${page}`)
          .then((j) => (j.data ?? []).map((p) => parsePool(p, network)))
          .catch(() => []),
      );
    }
    requests.push(
      getJSON(`${GT}/networks/${network}/trending_pools?page=1`)
        .then((j) => (j.data ?? []).map((p) => parsePool(p, network)))
        .catch(() => []),
    );
  }

  const all = (await Promise.all(requests)).flat();

  const best = new Map();
  for (const token of all) {
    if (!passes(token)) continue;
    // One pool per token — keep the deepest, which is the one that prices it.
    const seen = best.get(token.id);
    if (!seen || token.liquidity > seen.liquidity) best.set(token.id, token);
  }

  return [...best.values()]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}
