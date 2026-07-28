#!/usr/bin/env node
/**
 * The entire backend.
 *
 * Runs on a schedule in GitHub Actions, fetches prices once for everybody, and
 * publishes static JSON. Clients read only what this writes (DECISIONS 0007),
 * which is what keeps price-data cost flat regardless of how many people play
 * — one fetch serves the whole world.
 *
 *   node tools/snapshot.mjs
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'site', 'data');
const ARCHIVE = join(DATA, 'archive');

/**
 * The curated universe. Curation *is* the product — it is what keeps the
 * contest skill-predominant rather than a coin flip (DECISIONS 0008), so this
 * list is a deliberate editorial choice, not a data dump.
 */
const MAJORS = [
  'bitcoin', 'ethereum', 'solana', 'ripple', 'cardano',
  'avalanche-2', 'chainlink', 'sui', 'aptos', 'near',
];

const DEGEN = [
  'dogecoin', 'shiba-inu', 'pepe', 'bonk', 'dogwifcoin',
  'floki', 'popcat', 'book-of-meme', 'jupiter-exchange-solana', 'raydium',
  'hyperliquid', 'ethena', 'pendle', 'jito-governance-token',
];

const UNIVERSE = [...MAJORS, ...DEGEN];

const SLATE_MAJORS = 4;
const SLATE_DEGEN = 6;
const PICKS_REQUIRED = 5;
const PAYING_POSITIONS = 3;

// ---------------------------------------------------------------- fetch ----

/**
 * CoinGecko's keyless public API: no signup, and one /coins/markets call
 * returns up to 250 coins. At hourly cadence that is 24 calls a day, far
 * inside the keyless allowance.
 */
async function fetchMarkets(ids) {
  const url = new URL('https://api.coingecko.com/api/v3/coins/markets');
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('per_page', '250');
  url.searchParams.set('price_change_percentage', '24h');

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      const wait = 2 ** attempt * 2000;
      console.warn(`coingecko ${res.status}, retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new Error(`coingecko ${res.status}: ${await res.text()}`);
  }
  throw new Error('coingecko: exhausted retries');
}

function toSnapshot(markets) {
  const tokens = {};
  for (const m of markets) {
    if (!Number.isFinite(m.current_price) || m.current_price <= 0) continue;
    tokens[m.id] = {
      id: m.id,
      sym: m.symbol,
      name: m.name,
      price: m.current_price,
      img: m.image,
      mc: m.market_cap ?? null,
      ch24: m.price_change_percentage_24h ?? 0,
    };
  }
  return { ts: new Date().toISOString(), tokens };
}

// ---------------------------------------------------------------- slate ----

const utcDate = (d = new Date()) => d.toISOString().slice(0, 10);

/** Deterministic 32-bit hash so a given date always produces the same slate. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded shuffle — reproducible, and auditable after the fact. */
function shuffle(items, seed) {
  const out = [...items];
  let state = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 48271) % 2147483647) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildSlate(contestId, snapshot) {
  const live = (id) => Boolean(snapshot.tokens[id]);
  const seed = hash(contestId);

  const majors = shuffle(MAJORS.filter(live), seed).slice(0, SLATE_MAJORS);
  const degen = shuffle(DEGEN.filter(live), seed ^ 0x9e3779b9).slice(0, SLATE_DEGEN);
  // Bitcoin always rides so Buy & Hold BTC — the benchmark everyone wants to
  // beat — can always run.
  const tokens = [...new Set(['bitcoin', ...majors, ...degen])].filter(live);

  const openPrices = {};
  const openMeta = {};
  for (const id of tokens) {
    openPrices[id] = snapshot.tokens[id].price;
    openMeta[id] = { ch24: snapshot.tokens[id].ch24 ?? 0 };
  }

  return {
    contestId,
    // The real moment the open prices were taken, not an idealised midnight.
    // If the first run of the day happens at 13:00, these are 13:00 prices and
    // the record has to say so — a verifier replays against this timestamp.
    opensAt: snapshot.ts,
    closesAt: `${utcDate(new Date(Date.parse(`${contestId}T00:00:00Z`) + 86400000))}T00:00:00.000Z`,
    picksRequired: PICKS_REQUIRED,
    payingPositions: PAYING_POSITIONS,
    // Never announce a prize that is not already funded (DECISIONS 0005).
    prizePool: null,
    prizeTable: [],
    tokens,
    openPrices,
    openMeta,
  };
}

// ------------------------------------------------------------ settlement ----

function settle(oldSlate, snapshot, history) {
  const settledPrices = {};
  for (const id of oldSlate.tokens) {
    settledPrices[id] = snapshot.tokens[id]?.price ?? oldSlate.openPrices[id];
  }

  const record = {
    contestId: oldSlate.contestId,
    opensAt: oldSlate.opensAt,
    closesAt: oldSlate.closesAt,
    tokens: oldSlate.tokens,
    openPrices: oldSlate.openPrices,
    settledPrices,
    winner: null, // filled in once there are human entries to verify
  };

  history.contests = [record, ...(history.contests ?? [])].slice(0, 60);

  mkdirSync(ARCHIVE, { recursive: true });
  writeFileSync(join(ARCHIVE, `${oldSlate.contestId}.json`), `${JSON.stringify(record, null, 2)}\n`);
  return history;
}

// ----------------------------------------------------------------- main ----

function readJSON(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

const writeJSON = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

async function main() {
  mkdirSync(DATA, { recursive: true });

  const markets = await fetchMarkets(UNIVERSE);
  const snapshot = toSnapshot(markets);
  if (Object.keys(snapshot.tokens).length === 0) throw new Error('empty snapshot — refusing to publish');

  writeJSON(join(DATA, 'snapshot.json'), snapshot);
  console.log(`snapshot: ${Object.keys(snapshot.tokens).length} tokens @ ${snapshot.ts}`);

  const today = utcDate();
  const current = readJSON(join(DATA, 'slate.json'), null);
  let history = readJSON(join(DATA, 'history.json'), { contests: [] });

  if (!current || current.contestId !== today) {
    if (current) {
      history = settle(current, snapshot, history);
      console.log(`settled ${current.contestId}`);
    }
    const slate = buildSlate(today, snapshot);
    writeJSON(join(DATA, 'slate.json'), slate);
    writeJSON(join(DATA, 'history.json'), history);
    console.log(`new slate ${today}: ${slate.tokens.join(', ')}`);
  } else {
    console.log(`slate ${today} already open, prices refreshed`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
