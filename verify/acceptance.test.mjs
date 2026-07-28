/**
 * Acceptance criteria — structural stopping conditions.
 *
 * These guard shape rather than behaviour: that the app is one screen, that
 * removed things stay removed, that the modules the product depends on exist.
 * Behaviour lives in the unit suites; the user journey lives in verify/e2e.mjs.
 *
 * The point is that a decision, once made, cannot quietly rot back.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '');
const has = (p) => existsSync(join(ROOT, p));

const APP = read('site/js/app.js');
const HOME = read('site/js/views/home.js');

// ---------------------------------------------------------------------------
// One screen
// ---------------------------------------------------------------------------

test('the app is one screen, not a tab bar', () => {
  assert.ok(has('site/js/views/home.js'), 'home view must exist');
  assert.doesNotMatch(APP, /const TABS\s*=/, 'a tab list means the app fragmented again');
  assert.doesNotMatch(APP, /RENDERERS/, 'multiple top-level renderers means multiple apps');
});

test('bankroll, holdings and market all live on the home view', () => {
  assert.match(HOME, /bankroll/i);
  assert.match(HOME, /Holding/);
  assert.match(HOME, /Market/);
});

test('the views that fragmented the app are gone', () => {
  for (const dead of ['board.js', 'season.js', 'rules.js', 'contest.js', 'trade.js', 'slate.js']) {
    assert.ok(!has(`site/js/views/${dead}`), `${dead} should have been removed`);
  }
});

// ---------------------------------------------------------------------------
// Removed things stay removed
// ---------------------------------------------------------------------------

test('no bot opponents anywhere in the client', () => {
  assert.ok(!has('site/js/ghosts.js'), 'ghosts module should be gone');
  for (const file of readdirSync(join(ROOT, 'site/js'), { recursive: true })) {
    if (!String(file).endsWith('.js')) continue;
    const source = read(join('site/js', String(file)));
    assert.doesNotMatch(source, /\bBOT\b/, `${file} still renders a BOT badge`);
    assert.doesNotMatch(source, /buildGhosts|GHOST_DEFS/, `${file} still references ghosts`);
  }
});

test('no legal boilerplate that was never asked for', () => {
  for (const file of readdirSync(join(ROOT, 'site/js'), { recursive: true })) {
    if (!String(file).endsWith('.js')) continue;
    const source = read(join('site/js', String(file)));
    assert.doesNotMatch(source, /official rules|void where prohibited|is not a sponsor/i,
      `${file} carries unrequested legal copy`);
  }
});

// ---------------------------------------------------------------------------
// The parts the product actually runs on
// ---------------------------------------------------------------------------

test('the bankroll module is present and complete', async () => {
  const mod = await import('../site/js/bankroll.js');
  for (const fn of ['newBook', 'openPosition', 'closePosition', 'equity', 'markInterval', 'intervalReturn']) {
    assert.equal(typeof mod[fn], 'function', `bankroll.${fn} must exist`);
  }
});

test('the price feed has more than one source', async () => {
  const { SOURCES } = await import('../site/js/prices.js');
  assert.ok(SOURCES.length >= 2, 'one source is a single point of failure');
});

test('trading is reachable without picking anything first', () => {
  assert.match(APP, /renderHome/);
  assert.doesNotMatch(APP, /entryFor\(app\.data\.slate\.contestId\)\s*\?\s*'trade'/,
    'the home screen must not be gated behind an entry');
});

test('the market is ranked by trending score, not market cap', () => {
  assert.match(HOME, /\.score/);
  assert.doesNotMatch(HOME, /\.mc\s*\?\?\s*0\)\s*-\s*\(snapshot/, 'market-cap ordering puts blue chips first');
});

test('token artwork is rendered', () => {
  assert.match(HOME, /tokenAvatar/);
});

test('positions can be sized with a typed dollar amount', () => {
  assert.match(HOME, /ticket-input/);
});

test('email capture still exists', () => {
  assert.ok(has('site/js/email.js'));
  assert.match(APP, /submitEmail/);
});
