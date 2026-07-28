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
  minLiquidityUsd: 10_000,   // below this a single sell moves the price 40%
  minVolume24Usd: 25_000,    // proves someone other than the deployer is trading
  minAgeMinutes: 30,         // survive the instant-rug window
  maxAgeDays: 21,            // after three weeks it is not a new launch
  minTxns24: 50,            // filters wash-traded volume from two wallets
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GeckoTerminal's keyless tier allows roughly 30 calls a minute. Firing every
 * request at once gets the whole batch 429'd, and a swallowed 429 looks
 * identical to "no launches qualified today" — which is how a slate silently
 * collapses to one token. Requests are serialised with a gap, and failures are
 * logged rather than hidden.
 */
/** How many tokens the board carries at any moment. */
export const BOARD_SIZE = 100;

/**
 * Trending score.
 *
 * Mirrors how the established boards rank: a blend of 24h volume, transaction
 * count, liquidity and price momentum — not volume alone. Volume alone is
 * trivially faked by two wallets passing the same bag back and forth, and
 * transaction count is what separates a real crowd from a wash trade.
 */
function trendScore(t) {
  const volume = Math.log10(Math.max(1, t.volume));
  const txns = Math.log10(Math.max(1, t.txns));
  const liquidity = Math.log10(Math.max(1, t.liquidity));
  const momentum = Math.min(3, Math.abs(t.ch24) / 50); // either direction is interesting
  return volume * 3 + txns * 2.5 + liquidity * 1.5 + momentum;
}

async function getJSON(url, { retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) return res.json();
    if (res.status === 429) {
      const wait = 4000 * (attempt + 1);
      console.warn(`  rate limited, waiting ${wait}ms`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${url} → ${res.status}`);
  }
  throw new Error(`${url} → rate limited after ${retries} retries`);
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

/**
 * Pools plus their base-token artwork.
 *
 * `include=base_token` returns the token records alongside the pools, so the
 * picture arrives in the same request. A memecoin *is* its picture — a list of
 * bare tickers reads as a spreadsheet, not a launch board.
 */
function mapPools(body, network) {
  const art = new Map();
  for (const item of body?.included ?? []) {
    const url = item?.attributes?.image_url;
    if (item?.id && url && url !== 'missing.png') art.set(item.id, url);
  }
  return (body?.data ?? []).map((pool) => {
    const token = parsePool(pool, network);
    const baseId = pool.relationships?.base_token?.data?.id;
    if (baseId && art.has(baseId)) token.img = art.get(baseId);
    return token;
  });
}

function passes(t) {
  if (!Number.isFinite(t.price) || t.price <= 0) return false;
  if (!t.address || !t.sym || t.sym === '?') return false;
  if (t.liquidity < FILTERS.minLiquidityUsd) return false;
  if (t.volume < FILTERS.minVolume24Usd) return false;
  if (t.txns < FILTERS.minTxns24) return false;
  if (t.ageHours != null && t.ageHours < FILTERS.minAgeMinutes / 60) return false;
  // Stablecoins and wrapped majors are not memecoins.
  if (/^(w?eth|wbtc|usdt|usdc|dai|weth|wbnb|bnb|sol|wsol|busd|steth|usde)$/i.test(t.sym)) return false;
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
/**
 * Token artwork, straight from DexScreener.
 *
 * A memecoin *is* its picture — a list of bare tickers reads as a spreadsheet,
 * not a launch board. One call covers 30 addresses.
 */
async function attachImages(tokens) {
  const byAddress = new Map(tokens.map((t) => [t.address.toLowerCase(), t]));
  const addresses = [...byAddress.keys()];

  for (let i = 0; i < addresses.length; i += 30) {
    const batch = addresses.slice(i, i + 30);
    try {
      const body = await getJSON(`https://api.dexscreener.com/latest/dex/tokens/${batch.join(',')}`);
      for (const pair of body?.pairs ?? []) {
        const token = byAddress.get(String(pair?.baseToken?.address ?? '').toLowerCase());
        const img = pair?.info?.imageUrl;
        if (token && img && !token.img) token.img = img;
      }
    } catch {
      /* artwork is cosmetic — never fail the slate over it */
    }
  }
  return tokens;
}

/**
 * The live board: the most active memecoins right now, refreshed every run.
 *
 * Not a fixed slate. Pools are pulled sorted by 24h volume and re-ranked by
 * trending score, so the board turns over on its own as attention moves — which
 * is the point. What is hot at 2am is not what was hot at noon.
 */
export async function fetchFreshTokens({ limit = BOARD_SIZE } = {}) {
  const urls = [];
  // Volume-sorted pages give the currently-busiest pools; trending and new
  // pages catch momentum the raw volume ranking lags behind.
  for (const network of NETWORKS) {
    for (const page of [1, 2, 3]) {
      urls.push([`${GT}/networks/${network}/pools?page=${page}&sort=h24_volume_usd_desc&include=base_token`, network]);
    }
    urls.push([`${GT}/networks/${network}/trending_pools?page=1&include=base_token`, network]);
    urls.push([`${GT}/networks/${network}/new_pools?page=1&include=base_token`, network]);
  }

  const all = [];
  let failures = 0;
  for (const [url, network] of urls) {
    try {
      all.push(...mapPools(await getJSON(url), network));
    } catch (err) {
      failures += 1;
      console.warn(`  ${err.message}`);
    }
    await sleep(2100); // stay inside the keyless quota
  }
  if (failures === urls.length) throw new Error('every pool request failed — refusing to publish an empty slate');

  const best = new Map();
  for (const token of all) {
    if (!passes(token)) continue;
    // One pool per token — keep the deepest, which is the one that prices it.
    const seen = best.get(token.id);
    if (!seen || token.liquidity > seen.liquidity) best.set(token.id, token);
  }

  const chosen = [...best.values()]
    .map((t) => ({ ...t, score: trendScore(t) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return attachImages(chosen);
}
