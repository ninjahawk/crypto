/**
 * Price-feed logic — mechanical, no network.
 *
 * The e2e suite cannot exercise the live feed in an environment without
 * outbound HTTPS, and an untestable module is exactly where a silent failure
 * hides. This drives createPriceFeed against a stubbed fetch so the parsing,
 * failover and callback behaviour are checked wherever the tests run.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createPriceFeed, SOURCES, parseDexScreener, parseGeckoTerminal } from '../site/js/prices.js';

const TOKENS = {
  'eth:0xaaa': { sym: 'AAA', price: 1, dex: { network: 'eth', address: '0xAAA' } },
  'sol:BBB': { sym: 'BBB', price: 2, dex: { network: 'solana', address: 'BBB' } },
  bitcoin: { sym: 'BTC', price: 60000 }, // no dex block — must be ignored
};

test('parses a DexScreener payload and keeps the deepest pool', () => {
  const out = parseDexScreener({
    pairs: [
      { baseToken: { address: '0xAAA' }, priceUsd: '1.50', liquidity: { usd: 1000 }, priceChange: { h24: 10 } },
      { baseToken: { address: '0xAAA' }, priceUsd: '1.40', liquidity: { usd: 9000 }, priceChange: { h24: 12 } },
    ],
  });
  assert.equal(out.length, 1, 'one entry per token');
  assert.equal(out[0].address, '0xaaa');
  assert.equal(out[0].price, 1.4, 'deepest pool prices the token');
  assert.equal(out[0].ch24, 12);
});

test('DexScreener parser rejects unusable prices', () => {
  const out = parseDexScreener({
    pairs: [
      { baseToken: { address: '0xAAA' }, priceUsd: '0', liquidity: { usd: 1000 } },
      { baseToken: { address: '0xBBB' }, priceUsd: 'not-a-number', liquidity: { usd: 1000 } },
      { baseToken: { address: '0xCCC' }, priceUsd: '3', liquidity: { usd: 500 } },
    ],
  });
  assert.deepEqual(out.map((o) => o.address), ['0xccc']);
});

test('parses a GeckoTerminal payload', () => {
  const out = parseGeckoTerminal({
    data: [
      {
        attributes: {
          base_token_price_usd: '2.25',
          reserve_in_usd: '5000',
          price_change_percentage: { h24: '-8' },
        },
        relationships: { base_token: { data: { id: 'eth_0xAAA' } } },
      },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].address, '0xaaa');
  assert.equal(out[0].price, 2.25);
  assert.equal(out[0].ch24, -8);
});

test('malformed payloads yield nothing rather than throwing', () => {
  for (const bad of [null, {}, { pairs: null }, { data: 'nope' }]) {
    assert.deepEqual(parseDexScreener(bad), []);
    assert.deepEqual(parseGeckoTerminal(bad), []);
  }
});

test('feed calls back with updated prices', async () => {
  const seen = [];
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      pairs: [{ baseToken: { address: '0xAAA' }, priceUsd: '7.77', liquidity: { usd: 100 }, priceChange: { h24: 5 } }],
    }),
  });

  const feed = createPriceFeed(TOKENS, (id, price, ch24) => seen.push({ id, price, ch24 }), {
    fetchImpl: fakeFetch,
    pollMs: 10_000,
    autostart: false,
  });
  await feed.pollNow();
  feed.stop();

  assert.deepEqual(seen, [{ id: 'eth:0xaaa', price: 7.77, ch24: 5 }]);
  assert.ok(feed.isLive(), 'a successful poll marks the feed live');
});

test('tokens without a dex block are never requested', async () => {
  const urls = [];
  const fakeFetch = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ pairs: [] }) };
  };
  const feed = createPriceFeed(TOKENS, () => {}, { fetchImpl: fakeFetch, pollMs: 10_000, autostart: false });
  await feed.pollNow();
  feed.stop();
  assert.ok(urls.length > 0);
  assert.ok(!urls.join('|').includes('bitcoin'));
});

test('a dead primary source fails over to the backup', async () => {
  const tried = [];
  const fakeFetch = async (url) => {
    tried.push(url);
    if (url.includes('dexscreener')) throw new Error('blocked');
    return {
      ok: true,
      json: async () => ({
        data: [{
          attributes: { base_token_price_usd: '3.3', reserve_in_usd: '1', price_change_percentage: { h24: '1' } },
          relationships: { base_token: { data: { id: 'eth_0xAAA' } } },
        }],
      }),
    };
  };

  const seen = [];
  const feed = createPriceFeed(TOKENS, (id, price) => seen.push({ id, price }), {
    fetchImpl: fakeFetch,
    pollMs: 10_000,
    autostart: false,
  });
  await feed.pollNow();
  feed.stop();

  assert.ok(tried.some((u) => u.includes('dexscreener')), 'primary was attempted');
  assert.ok(tried.some((u) => u.includes('geckoterminal')), 'backup was attempted');
  assert.deepEqual(seen, [{ id: 'eth:0xaaa', price: 3.3 }]);
});

test('every source failing leaves the feed not-live rather than throwing', async () => {
  const feed = createPriceFeed(TOKENS, () => {}, {
    fetchImpl: async () => { throw new Error('offline'); },
    pollMs: 10_000,
    autostart: false,
  });
  await feed.pollNow();
  assert.equal(feed.isLive(), false, 'a dead feed must report itself dead, not pretend');
  feed.stop();
});

test('there is more than one source, so one blocked domain is survivable', () => {
  assert.ok(SOURCES.length >= 2);
});
