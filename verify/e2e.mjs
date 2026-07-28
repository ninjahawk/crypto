#!/usr/bin/env node
/**
 * End-to-end check — the frozen benchmark.
 *
 * "A loop is a task with a check. A task without a check is just hope."
 *
 * Every previous round shipped on my own assessment that things looked right,
 * and the user found the bugs. This file replaces that opinion with a
 * mechanical gate: it drives a real browser against the real site and asserts
 * every user-facing claim the product makes.
 *
 * Rules for this file:
 *   1. It is FROZEN during a fix loop. Never weaken an assertion to make a
 *      pass go green — that is moving the benchmark, and it is how a loop
 *      talks itself into success.
 *   2. Exit code 0 means shippable. Non-zero means not.
 *   3. It runs against a URL, so the same check covers local and production.
 *
 *   node verify/e2e.mjs [url]
 */

import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:8099/';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const results = [];
let hasEgress = true;
let browser;
let page;
const jsErrors = [];

function check(name, passed, detail = '') {
  results.push({ name, passed, detail, skipped: false });
  const mark = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${mark}  ${name}${detail ? `  — ${detail}` : ''}`);
  return passed;
}

/**
 * A check that genuinely needs outbound network.
 *
 * When the environment has no egress this reports SKIP, never PASS. Counting an
 * unrunnable check as a pass is how a benchmark starts lying in the one
 * direction that matters — it would have let every live-price bug through.
 */
function checkLive(name, passed, detail = '') {
  if (!hasEgress) {
    results.push({ name, passed: true, skipped: true, detail: 'no outbound network in this environment' });
    console.log(`  \x1b[33mSKIP\x1b[0m  ${name}  — environment has no egress`);
    return true;
  }
  return check(name, passed, detail);
}

const money = (text) => Number(String(text).replace(/[^0-9.-]/g, '')) || 0;

async function main() {
  // The sandbox routes outbound HTTPS through a proxy that the browser does
  // not pick up on its own. Without this the price API is unreachable and the
  // live-feed checks fail for an environment reason rather than a real one —
  // which would make the benchmark lie in the most dangerous direction.
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  browser = await chromium.launch({
    executablePath: CHROME,
    proxy: proxy ? { server: proxy, bypass: 'localhost,127.0.0.1' } : undefined,
    args: ['--ignore-certificate-errors'],
  });
  page = await browser.newPage({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });

  page.on('pageerror', (e) => jsErrors.push(`${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|ERR_|net::/i.test(m.text())) jsErrors.push(m.text());
  });

  console.log(`\ne2e → ${URL}\n`);

  await page.goto(URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
  hasEgress = await page.evaluate(async () => {
    try {
      const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/0x0000000000000000000000000000000000000000');
      return r.ok || r.status < 500;
    } catch {
      return false;
    }
  }).catch(() => false);
  if (!hasEgress) console.log('  (no outbound network — live checks will be skipped)\n');

  // ---- 1. loads ----------------------------------------------------------
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  const loaded = await page.waitForSelector('.pick, .row-tap', { timeout: 20000 }).then(() => true).catch(() => false);
  if (!check('site loads and renders content', loaded)) return;

  // ---- 2. the board is a live top-100, with artwork ----------------------
  await page.locator('.chip', { hasText: 'Trade' }).click();
  await page.waitForTimeout(1200);

  const marketRows = await page.locator('.row-tap').count();
  check('market carries 50+ tokens', marketRows >= 50, `${marketRows} rows`);

  const imgs = await page.locator('.row-tap .avatar img').count();
  check('most tokens have artwork', imgs >= marketRows * 0.6, `${imgs}/${marketRows} with art`);

  const names = await page.locator('.row-tap .row-name').allInnerTexts();
  check('bitcoin is not tradeable', !names.some((n) => /^BTC$/i.test(n.trim())));

  // ---- 3. prices tick live ----------------------------------------------
  const priceNodes = page.locator('.row-tap .row-value');
  const before = await priceNodes.allInnerTexts();
  await page.waitForTimeout(14000);
  const after = await priceNodes.allInnerTexts();
  const moved = before.filter((v, i) => v !== after[i]).length;
  checkLive('prices tick live without reload', moved > 0, `${moved} of ${before.length} moved in 14s`);

  const dotLive = await page.locator('#livedot.is-live').count();
  checkLive('live indicator is green', dotLive === 1);

  // ---- 3b. the live pipeline, proven without egress -----------------------
  // Route interception fulfils the price request inside the browser, so the
  // whole chain — feed → snapshot → repaint → DOM — is verified mechanically
  // even where there is no outbound network. This is the check that would have
  // caught every "it isn't updating" bug reported so far.
  {
    const stubPage = await browser.newPage({ viewport: { width: 420, height: 900 } });
    let bumped = 0;
    await stubPage.route(/api\.dexscreener\.com/, async (route) => {
      bumped += 1;
      const url = route.request().url();
      const addresses = decodeURIComponent(url.split('/tokens/')[1] ?? '').split(',');
      // Walk the price up on every poll so a change is unmistakable.
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          pairs: addresses.map((address) => ({
            baseToken: { address },
            priceUsd: String(1 + bumped),
            liquidity: { usd: 100000 },
            priceChange: { h24: 42 },
          })),
        }),
      });
    });

    await stubPage.goto(URL, { waitUntil: 'domcontentloaded' });
    await stubPage.waitForSelector('.pick, .row-tap', { timeout: 20000 });
    await stubPage.locator('.chip', { hasText: 'Trade' }).click();
    await stubPage.waitForTimeout(1500);

    const stubBefore = await stubPage.locator('.row-tap .row-value').first().innerText();
    await stubPage.waitForTimeout(11000);
    const stubAfter = await stubPage.locator('.row-tap .row-value').first().innerText();

    check('price requests are actually issued', bumped > 0, `${bumped} requests`);
    check('live feed repaints the DOM', stubBefore !== stubAfter, `${stubBefore} → ${stubAfter}`);
    check('live indicator turns green when the feed delivers',
      (await stubPage.locator('#livedot.is-live').count()) === 1);

    // Open a position, then confirm it revalues as the price moves. This was a
    // reported symptom: holdings stayed frozen while the market list ticked.
    await stubPage.locator('.row-tap').first().click();
    await stubPage.waitForTimeout(600);
    await stubPage.locator('.ticket-input').fill('500');
    await stubPage.waitForTimeout(200);
    await stubPage.locator('.sheet .btn').first().click();
    await stubPage.waitForTimeout(1200);

    const heldBefore = await stubPage.locator('.card .row-tap .row-sub').first().innerText();
    const equityBeforeTick = await stubPage.locator('.value-main').innerText();
    await stubPage.waitForTimeout(11000);
    const heldAfter = await stubPage.locator('.card .row-tap .row-sub').first().innerText();
    const equityAfterTick = await stubPage.locator('.value-main').innerText();

    check('open positions revalue as prices move', heldBefore !== heldAfter,
      `${heldBefore.slice(0, 22)} → ${heldAfter.slice(0, 22)}`);
    check('bankroll equity moves with the position', equityBeforeTick !== equityAfterTick,
      `${equityBeforeTick} → ${equityAfterTick}`);

    await stubPage.close();
  }

  // ---- 4. typed dollar amounts ------------------------------------------
  await page.locator('.row-tap').first().click();
  await page.waitForTimeout(600);

  const hasInput = await page.locator('.ticket-input').count();
  if (!check('trade ticket accepts a typed amount', hasInput === 1)) return finish();

  await page.locator('.ticket-input').fill('250');
  await page.waitForTimeout(300);
  const hint = await page.locator('.ticket-hint').last().innerText();
  check('typed amount converts to a quantity', /[0-9]/.test(hint), hint.slice(0, 48));

  // ---- 5. buying moves real money ---------------------------------------
  const equityBefore = money(await page.locator('.value-main').innerText());
  await page.locator('.sheet .btn').first().click();
  await page.waitForTimeout(1500);

  const cashLine = await page.locator('.value-deltas').innerText();
  const cashAfter = money(cashLine.split('Cash')[1] ?? '0');
  check('buying $250 leaves ~$9,750 cash', Math.abs(cashAfter - 9750) < 5, `cash $${cashAfter}`);

  const positions = await page.locator('.card .row-tap').count();
  check('a position now exists', positions > 0);

  const equityAfter = money(await page.locator('.value-main').innerText());
  check('equity is preserved by the buy', Math.abs(equityAfter - equityBefore) < 30,
    `${equityBefore} → ${equityAfter}`);

  // ---- 6. positions revalue live ----------------------------------------
  const posValueBefore = await page.locator('.card .row-tap .row-sub').first().innerText();
  await page.waitForTimeout(14000);
  const posValueAfter = await page.locator('.card .row-tap .row-sub').first().innerText();
  checkLive('open positions revalue live', posValueBefore !== posValueAfter,
    `${posValueBefore.slice(0, 20)} → ${posValueAfter.slice(0, 20)}`);

  // ---- 7. selling returns the money -------------------------------------
  await page.locator('.card .row-tap').first().click();
  await page.waitForTimeout(600);
  await page.locator('.ticket-chip', { hasText: 'Max' }).click();
  await page.waitForTimeout(300);
  await page.locator('.sheet .btn').first().click();
  await page.waitForTimeout(1500);

  const cashFinal = money((await page.locator('.value-deltas').innerText()).split('Cash')[1] ?? '0');
  check('selling everything returns cash to ~$10,000', cashFinal > 9000, `cash $${cashFinal}`);

  // ---- 8. the board shows the player ------------------------------------
  await page.locator('.chip', { hasText: 'Board' }).click();
  await page.waitForTimeout(1000);
  check('player appears on the board', (await page.locator('.board-row.is-me').count()) === 1);
  check('board shows movement deltas', (await page.locator('.board-delta').count()) > 0);

  // ---- 9. layout ---------------------------------------------------------
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check('no horizontal overflow', !overflow);

  return finish();
}

function finish() {
  check('no JavaScript errors', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));
}

try {
  await main();
} catch (err) {
  check('suite ran to completion', false, err.message.split('\n')[0].slice(0, 90));
} finally {
  await browser?.close();
}

const failed = results.filter((r) => !r.passed);
const skipped = results.filter((r) => r.skipped);
console.log(`\n${results.length - failed.length - skipped.length}/${results.length - skipped.length} passed`
  + (skipped.length ? `, ${skipped.length} skipped (no egress)` : ''));
if (failed.length) {
  console.log('\nFAILING:');
  failed.forEach((f) => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
}
process.exit(failed.length === 0 ? 0 : 1);
