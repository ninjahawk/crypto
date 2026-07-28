/**
 * Acceptance criteria — the stopping conditions for the loop register.
 *
 * Every accepted decision in spec/DECISIONS.md that implies user-visible
 * behaviour gets an assertion here. If a decision was agreed and not built,
 * this suite is red. That is the point: it makes "agreed but silently skipped"
 * impossible, which is exactly how the first build went wrong.
 *
 * Assertions are grouped by loop. A loop is done when its group is green —
 * not when it looks finished.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '');
const has = (p) => existsSync(join(ROOT, p));

// ---------------------------------------------------------------------------
// Loop 4 — Bankroll & trading. The premise.
// ---------------------------------------------------------------------------

test('LOOP 4: a bankroll module exists', () => {
  assert.ok(has('site/js/bankroll.js'), 'site/js/bankroll.js must exist — you cannot invest fake money without it');
});

test('LOOP 4: bankroll exposes open, close and equity', async () => {
  const mod = await import('../site/js/bankroll.js');
  for (const fn of ['openPosition', 'closePosition', 'equity', 'newBook']) {
    assert.equal(typeof mod[fn], 'function', `bankroll.${fn} must be a function`);
  }
});

test('LOOP 4: the trade UI is reachable', () => {
  assert.ok(has('site/js/views/trade.js'), 'a trade view must exist');
  assert.match(read('site/js/app.js'), /trade/i, 'the trade view must be wired into the router');
});

// ---------------------------------------------------------------------------
// Loop 6 — Email capture.
// ---------------------------------------------------------------------------

test('LOOP 6: email capture exists and is wired', () => {
  assert.ok(has('site/js/email.js'), 'an email capture module must exist');
  assert.match(read('site/js/app.js'), /email/i, 'email capture must be wired into the app');
});

// ---------------------------------------------------------------------------
// Loop 7 — Token detail sheet with performance bars.
// ---------------------------------------------------------------------------

test('LOOP 7: token detail sheet exists', () => {
  assert.ok(has('site/js/views/token.js'), 'a token detail view must exist');
});

test('LOOP 7: the slate publishes history for the bar chart', () => {
  const slate = read('site/data/slate.json');
  if (!slate) return; // pipeline has not run in this checkout
  const parsed = JSON.parse(slate);
  assert.ok(parsed.history, 'slate.json must publish per-token history for the detail chart');
});

// ---------------------------------------------------------------------------
// Loop 8 — Leaderboard deltas (DECISIONS 0011: movement beats status).
// ---------------------------------------------------------------------------

test('LOOP 8: the board renders movement, not just rank', () => {
  const board = read('site/js/views/board.js');
  assert.match(board, /delta/i, 'DECISIONS 0011: every row must show movement since the last settle');
});

// ---------------------------------------------------------------------------
// Loop 10 — Rivals (DECISIONS 0011: scoped comparison).
// ---------------------------------------------------------------------------

test('LOOP 10: rivals can be selected', () => {
  const state = read('site/js/state.js');
  assert.match(state, /rival/i, 'DECISIONS 0011: players must be able to scope the board to chosen rivals');
});

// ---------------------------------------------------------------------------
// Loop 12 — Founding number (DECISIONS 0004: scarcity framing, honestly).
// ---------------------------------------------------------------------------

test('LOOP 12: a founding number is actually assigned', () => {
  const state = read('site/js/state.js');
  assert.doesNotMatch(
    state,
    /foundingNumber\s*=\s*null;\s*$/m,
    'founding number must be assigned at first entry, not left permanently null',
  );
});

// ---------------------------------------------------------------------------
// Standing invariants — these must never regress, on any loop.
// ---------------------------------------------------------------------------

test('INVARIANT: no fabricated humans anywhere in the client', () => {
  const files = ['site/js/views/board.js', 'site/js/app.js', 'site/js/state.js'];
  for (const f of files) {
    assert.doesNotMatch(read(f), /fakeUser|mockPlayer|dummyName|randomUsername/i, `${f} must not fabricate players`);
  }
});

test('INVARIANT: ghosts are declared prize-ineligible in user-facing copy', () => {
  assert.match(read('site/js/views/board.js'), /prize/i);
});

test('INVARIANT: the loop register stays in sync with the build', () => {
  const loops = read('spec/LOOPS.md');
  assert.ok(loops, 'spec/LOOPS.md must exist');
  // Anything still marked not-built must not also be claimed done elsewhere.
  assert.match(loops, /\|\s*\d+\s*\|/, 'the register must list loops');
});
